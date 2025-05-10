const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../config/db'); 

async function generatePdf(petId, recordId) {
    let pdfPath = null;
    let stream = null;

    try { 
        const dateQuery = `
            SELECT p.pet_name, r.record_date
            FROM pet_info p
            JOIN record_info r ON p.pet_id = r.pet_id
            WHERE p.pet_id = ? AND r.record_id = ?
            LIMIT 1
        `;
        const [initialData] = await db.query(dateQuery, [petId, recordId]);
        const pDataForFilename = initialData.length > 0 ? initialData[0] : null;

        if (!pDataForFilename) {
            throw new Error("Pet or Record not found for filename generation.");
        }

        // Filename and Path setup 
        const recordDate = pDataForFilename.record_date ? new Date(pDataForFilename.record_date) : new Date();
        const year = recordDate.getFullYear();
        const month = String(recordDate.getMonth() + 1).padStart(2, '0');
        const day = String(recordDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        const baseFilename = `${pDataForFilename.pet_name || 'Pet'}_Medical_Record_${formattedDate}`;
        const sanitizedFilename = baseFilename.replace(/[^a-z0-9_-]/gi, '_');
        const baseDir = path.join(__dirname, '../generated_pdfs');
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        let counter = 0;
        let finalFilename = `${sanitizedFilename}.pdf`;
        pdfPath = path.join(baseDir, finalFilename);
        while (fs.existsSync(pdfPath)) {
            counter++;
            finalFilename = `${sanitizedFilename}(${counter}).pdf`;
            pdfPath = path.join(baseDir, finalFilename);
        } 


        // Create PDF Document 
        const doc = new PDFDocument({
            margin: 50,
            size: 'legal',
            autoFirstPage: false,
            bufferPages: true
        });

        stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        // Fetch Full Pet and Record Data  
        const petQuery = `
            SELECT p.pet_id, p.pet_name, p.pet_breed, p.pet_birthday, p.pet_age_year, p.pet_age_month,
                p.pet_gender, p.pet_color, p.pet_vitality, p.pet_status,
                ps.spec_description AS species,
                o.owner_address, o.owner_alt_person1, o.owner_alt_contact1, o.owner_alt_person2, o.owner_alt_contact2,
                u.user_firstname, u.user_lastname, u.user_email, u.user_contact,
                r.record_id, r.record_date, r.record_condition, r.record_symptom, r.record_temp, r.record_weight,
                r.record_recent_visit, r.record_purpose, r.record_purchase, r.record_lab_file,
                s.surgery_type, s.surgery_date, s.surgery_id,
                d.diagnosis_text,
                lab.lab_description,
                vax.vax_type AS vaccine_type, imm.imm_rec_date AS vaccine_date, imm.imm_rec_quantity AS vaccine_doses
            FROM record_info r
            JOIN pet_info p ON r.pet_id = p.pet_id
            JOIN users u ON p.user_id = u.user_id
            JOIN owner o ON u.user_id = o.user_id
            LEFT JOIN match_pet_species mps ON p.pet_id = mps.pet_id
            LEFT JOIN pet_species ps ON mps.spec_id = ps.spec_id
            LEFT JOIN surgery_info s ON r.surgery_id = s.surgery_id
            LEFT JOIN diagnosis d ON r.diagnosis_id = d.diagnosis_id
            LEFT JOIN match_rec_lab mrl ON r.record_id = mrl.record_id
            LEFT JOIN lab_info lab ON mrl.lab_id = lab.lab_id
            LEFT JOIN immunization_record imm ON p.pet_id = imm.pet_id
            LEFT JOIN vax_info vax ON imm.vax_id = vax.vax_id
            WHERE p.pet_id = ? AND r.record_id = ?
            ORDER BY imm.imm_rec_date DESC
        `;
        const [rows] = await db.query(petQuery, [petId, recordId]);

        if (rows.length === 0) {
            throw new Error("Pet record details not found after query.");
        }
        const petData = rows[0];  
        const uniqueVaccines = new Map();
        rows.forEach(row => {
            if (row.vaccine_type && row.vaccine_date) {
                const key = `${row.vaccine_type}-${new Date(row.vaccine_date).toISOString()}`;
                if (!uniqueVaccines.has(key)) {
                    uniqueVaccines.set(key, {
                        vaccine_type: row.vaccine_type,
                        vaccine_date: new Date(row.vaccine_date).toLocaleDateString(),
                        vaccine_doses: row.vaccine_doses || 'N/A'
                    });
                }
            }
        });
        const vaccineRecords = Array.from(uniqueVaccines.values());
        vaccineRecords.sort((a, b) => new Date(b.vaccine_date) - new Date(a.vaccine_date));


        // Helper Functions 
        function addHeader(docInstance) {
            const logoPath = path.join(__dirname, '../assets/clinic_logo.png');
            try {
                if (fs.existsSync(logoPath)) {
                    docInstance.image(logoPath, docInstance.page.margins.left || 50, 35, { width: 50 });
                } else { console.warn("Logo file not found at:", logoPath); }
            } catch (imgErr) { console.error("Error loading logo image:", imgErr); }

            const headerTextX = (docInstance.page.margins.left || 50) + 60;
            docInstance.fillColor('black')
                    .font('Helvetica-Bold').fontSize(16).text('Kho Veterinary Clinic', headerTextX, 50)
                    .font('Helvetica').fontSize(10).text('715 Earnshaw St., Sampaloc, Manila, 1008 Metro Manila', headerTextX, 70);
            
            // Add generation timestamp in top right corner
    const currentTime = new Date();
    const formattedTime = `${currentTime.toLocaleDateString()} ${currentTime.toLocaleTimeString()}`;
    const rightMargin = docInstance.page.margins.right || 50;
    const timestampX = docInstance.page.width - rightMargin - 150; // Position from right edge
    
    // Save the current graphics state
    docInstance.save();
    
    // Set gray color only for the timestamp
    docInstance.fillColor('gray')
              .font('Helvetica-Oblique').fontSize(9)
              .text(`Generated: ${formattedTime}`, timestampX, 50, { 
                 width: 150,
                 align: 'right'
              });
    
    // Restore the previous graphics state (including black fill color)
    docInstance.restore();
        }
 
        function addFooter(docInstance) {
            const pageIndex = docInstance.bufferedPageRange().start; 
            const pageHeight = docInstance.page.height;
            const bottomMargin = docInstance.page.margins.bottom || 50;
            const footerY = pageHeight - bottomMargin - 30;
            const footerText = "This record is not valid for other medical use and cannot be used by any other establishment, not unless it is approved by a veterinarian of Kho Veterinary Clinic.";
 
            if (footerY <= (docInstance.page.margins.top || 50)) {
                console.error(`      Error: Calculated footer Y (${footerY}) is too low or negative.`);
                return;
            }

            docInstance.save();
            docInstance.font('Helvetica-BoldOblique')
                        .fontSize(8)
                        .fillColor('black')
                        .text(footerText,
                            docInstance.page.margins.left || 50,
                            footerY,
                            {
                                width: docInstance.page.width - (docInstance.page.margins.left || 50) - (docInstance.page.margins.right || 50),
                                align: 'center'
                            }
                        );
            docInstance.restore();
        }

        function addSignatureArea(docInstance) {
            const pageIndex = docInstance.bufferedPageRange().start; 
            const pageHeight = docInstance.page.height;
            const bottomMargin = docInstance.page.margins.bottom || 50;
            const rightMargin = docInstance.page.margins.right || 50;
            const sigWidth = 220;
            const sigHeightEstimate = 55;
            const footerBuffer = 30;
            const spaceAboveFooter = 15;

            let sigStartY = pageHeight - bottomMargin - footerBuffer - spaceAboveFooter - sigHeightEstimate;
            const sigX = docInstance.page.width - rightMargin - sigWidth;
 
            if (sigStartY <= (docInstance.page.margins.top || 50)) {
                    console.error(`      Error: Calculated signature Y (${sigStartY}) is too low or negative.`);
                    return;
            }

            docInstance.save();
            const topLabel = "*This medical record is approved by:";
            docInstance.font('Helvetica')
                        .fontSize(9)
                        .fillColor('black')
                        .text(topLabel, sigX, sigStartY, { width: sigWidth, align: 'left' });
            let lineY = sigStartY + docInstance.heightOfString(topLabel, { fontSize: 9, width: sigWidth }) + 30;
            docInstance.moveTo(sigX, lineY)
                        .lineTo(sigX + sigWidth, lineY)
                        .lineWidth(0.5)
                        .strokeColor('black')
                        .stroke();
            let bottomLabelY = lineY + 5;
            const bottomLabel = "Signature over printed name";
            docInstance.font('Helvetica')
                        .fontSize(9)
                        .fillColor('black')
                        .text(bottomLabel, sigX, bottomLabelY, { width: sigWidth, align: 'center' });
            docInstance.restore();
        }

        // Add this function to your helper functions section
function addPageNumbers(docInstance) {
    const pageCount = docInstance.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
        docInstance.switchToPage(i);
        
        // Calculate position for page number (bottom right)
        const pageHeight = docInstance.page.height;
        const pageWidth = docInstance.page.width;
        const bottomMargin = docInstance.page.margins.bottom || 50;
        const rightMargin = docInstance.page.margins.right || 50;
        
        // Position the page number above the footer
        const footerHeight = 30; // Adjust based on your footer height
        const pageNumY = pageHeight - bottomMargin - footerHeight + 15;
        const pageNumX = pageWidth - rightMargin;
        
        // Add page number text
        docInstance.save();
        docInstance.font('Helvetica-Oblique').fontSize(9)
            .fillColor('gray')
            .text(`Page ${i + 1} of ${pageCount}`,
                pageNumX - 70, // Position 70 points left of right margin
                pageNumY,
                {
                    width: 70,
                    align: 'right'
                }
            );
        docInstance.restore();
    }
}

        const addLabeledText = (docInstance, label, value, x, y, options = {}) => {
                const startY = y;
                const defaultOptions = { fontSize: 10, baseline: 'top' };
                const mergedOptions = { ...defaultOptions, ...options };
                const effectiveColumnWidth = options.columnWidth || (docInstance.page.width / 2) - x - 10;
                const labelText = `${label}:`;

                let labelWidth;
                if (typeof docInstance.measureString === 'function') {
                    labelWidth = docInstance.font('Helvetica-Bold').fontSize(mergedOptions.fontSize).measureString(labelText).width;
                } else {
                    labelWidth = docInstance.font('Helvetica-Bold').fontSize(mergedOptions.fontSize).widthOfString(labelText);
                }

                docInstance.font('Helvetica-Bold').fontSize(mergedOptions.fontSize)
                    .text(labelText, x, startY, { ...mergedOptions, continued: true });
 
                const valueWidth = Math.max(1, effectiveColumnWidth - labelWidth - 2);  

                docInstance.font('Helvetica').fontSize(mergedOptions.fontSize)
                    .text(` ${value || 'N/A'}`, {  
                        ...mergedOptions,
                        width: valueWidth,  
                        continued: false 
                    }); 
            return docInstance.y + 2; 
            };
 
        const addSectionHeader = (docInstance, text) => {
             const headerHeightEstimate = 40;
             if (docInstance.y + headerHeightEstimate > docInstance.page.height - (docInstance.page.margins.bottom || 50)) { 
                 docInstance.addPage();
             }
             docInstance.moveDown(0.5);
             docInstance.font('Helvetica-Bold').fontSize(14).fillColor('black').text(text, docInstance.page.margins.left || 50, docInstance.y, { align: 'left' });
             docInstance.moveDown(0.5);
             const lineY = docInstance.y;
             docInstance.moveTo(docInstance.page.margins.left || 50, lineY)
                .lineTo(docInstance.page.width - (docInstance.page.margins.right || 50), lineY)
                .lineWidth(0.5).strokeColor('black').stroke();
             docInstance.moveDown(0.5);
         };


        // Page Generation Logic 
        doc.on('pageAdded', () => {
            addHeader(doc);
            doc.y = 100; 
            doc.x = doc.page.margins.left || 50; 
        });

        doc.addPage(); 

        // PDF Content Generation 
        const leftMargin = doc.page.margins.left || 50;
        const rightMargin = doc.page.margins.right || 50;
        const contentWidth = doc.page.width - leftMargin - rightMargin;
        const leftColumnX = leftMargin;
        const rightColumnX = leftColumnX + contentWidth / 2 + 10; 
        const columnWidth = contentWidth / 2 - 15; 

        // Title Section
        doc.font('Helvetica-Bold').fontSize(16)
           .text('MEDICAL RECORD', leftMargin, doc.y, { width: contentWidth, align: 'center' })
           .moveDown(0.5);
        doc.font('Helvetica').fontSize(10)
           .text(`Date of Record: ${petData.record_date ? new Date(petData.record_date).toLocaleDateString() : 'N/A'}`, leftMargin, doc.y, { width: contentWidth, align: 'center' })
           .moveDown(1.5);

        // Pet Profile Section 
        addSectionHeader(doc, 'Pet Profile');
        let profileLeftY = doc.y; let profileRightY = doc.y;
        profileLeftY = addLabeledText(doc, 'ID', petData.pet_id, leftColumnX, profileLeftY, { columnWidth: columnWidth });
        profileLeftY = addLabeledText(doc, 'Name', petData.pet_name, leftColumnX, profileLeftY, { columnWidth: columnWidth });
        profileLeftY = addLabeledText(doc, 'Species', petData.species, leftColumnX, profileLeftY, { columnWidth: columnWidth });
        profileLeftY = addLabeledText(doc, 'Breed', petData.pet_breed, leftColumnX, profileLeftY, { columnWidth: columnWidth }); 
        profileLeftY = addLabeledText(doc, 'Gender', petData.pet_gender, leftColumnX, profileLeftY, { columnWidth: columnWidth });

        profileRightY = addLabeledText(doc, 'Birthday', petData.pet_birthday ? new Date(petData.pet_birthday).toLocaleDateString() : 'N/A', rightColumnX, profileRightY, { columnWidth: columnWidth });
        profileRightY = addLabeledText(doc, 'Age', `${petData.pet_age_year || '0'} years, ${petData.pet_age_month || '0'} months`, rightColumnX, profileRightY, { columnWidth: columnWidth });
        profileRightY = addLabeledText(doc, 'Color', petData.pet_color, rightColumnX, profileRightY, { columnWidth: columnWidth }); 
        profileRightY = addLabeledText(doc, 'Status', petData.pet_status || 'N/A', rightColumnX, profileRightY, { columnWidth: columnWidth });
        doc.y = Math.max(profileLeftY, profileRightY);
        doc.moveDown(1.0);

        // Contact Details Section
        addSectionHeader(doc, 'Contact Details');
        let contactLeftY = doc.y; let contactRightY = doc.y;
        contactLeftY = addLabeledText(doc, 'Owner', `${petData.user_firstname} ${petData.user_lastname}`, leftColumnX, contactLeftY, { columnWidth: columnWidth });
        contactLeftY = addLabeledText(doc, 'Email', petData.user_email, leftColumnX, contactLeftY, { columnWidth: columnWidth }); 
        contactLeftY = addLabeledText(doc, 'Emergency 1', `${petData.owner_alt_person1 || 'N/A'} - ${petData.owner_alt_contact1 || 'N/A'}`, leftColumnX, contactLeftY, { columnWidth: columnWidth }); // Will wrap if long
        contactLeftY = addLabeledText(doc, 'Emergency 2', `${petData.owner_alt_person2 || 'N/A'} - ${petData.owner_alt_contact2 || 'N/A'}`, leftColumnX, contactLeftY, { columnWidth: columnWidth }); // Will wrap if long

        contactRightY = addLabeledText(doc, 'Contact', petData.user_contact, rightColumnX, contactRightY, { columnWidth: columnWidth });
        
        // Address Section
        const addressStartY = contactRightY;
        const addressLabel = 'Address:';
        const addressValue = ` ${petData.owner_address || 'N/A'}`;
        doc.font('Helvetica-Bold').fontSize(10).text(addressLabel, rightColumnX, addressStartY, { continued: true, baseline: 'top' });
        let addressLabelWidth;
            if (typeof doc.measureString === 'function') {
                addressLabelWidth = doc.font('Helvetica-Bold').fontSize(10).measureString(addressLabel).width;
            } else {
                addressLabelWidth = doc.font('Helvetica-Bold').fontSize(10).widthOfString(addressLabel);
            }
        const addressValueWidth = Math.max(1, columnWidth - addressLabelWidth - 2); 
        doc.font('Helvetica').fontSize(10).text(addressValue, {  
            width: addressValueWidth, 
            baseline: 'top'
        });
        contactRightY = doc.y + 2; 
        doc.y = Math.max(contactLeftY, contactRightY);
        doc.moveDown(1.0);

        // Vaccination Record Section (Table) 
        addSectionHeader(doc, 'Vaccination Record');
        const tableStartY = doc.y;
        const tableWidth = contentWidth;
        const colWidths = [tableWidth * 0.50, tableWidth * 0.25, tableWidth * 0.25];
        const rowHeight = 25;  
        let tableCurrentY = tableStartY;
 
        const drawTableRow = (instance, y, height) => { 
             const tableLeftX = instance.page.margins.left || 50;
             instance.rect(tableLeftX, y, tableWidth, height).lineWidth(0.5).strokeColor('black').stroke();
             let currentX = tableLeftX;
             for (let i = 0; i < colWidths.length - 1; i++) {
                 currentX += colWidths[i];
                 instance.moveTo(currentX, y).lineTo(currentX, y + height).stroke();
             }
        };
        const addCellText = (instance, text, colIndex, y, height, align = 'left') => {  
            let cellX = instance.page.margins.left || 50;
            cellX += 5; 
             for(let i=0; i < colIndex; i++) { cellX += colWidths[i]; }
             const cellWidth = colWidths[colIndex] - 10;
             const textY = y + 7; 

             instance.font('Helvetica').fontSize(10).fillColor('black') 
                .text(text || 'N/A', cellX, textY, { width: cellWidth, align: align, baseline: 'top' });
        }; 
        drawTableRow(doc, tableCurrentY, rowHeight);
        doc.font('Helvetica-Bold').fontSize(10);
        addCellText(doc, 'Type of Vaccine', 0, tableCurrentY, rowHeight, 'center');
        addCellText(doc, 'Number of Doses', 1, tableCurrentY, rowHeight, 'center');
        addCellText(doc, 'Date', 2, tableCurrentY, rowHeight, 'center');
        tableCurrentY += rowHeight;
 
        if (vaccineRecords.length > 0) {
            vaccineRecords.forEach((vaccine, index) => {
                 if (tableCurrentY + rowHeight > doc.page.height - (doc.page.margins.bottom || 50)) {
                     console.log(`    Adding page break before vaccine row ${index + 1}`);
                     doc.addPage();
                     tableCurrentY = doc.y; 
                 }
                 drawTableRow(doc, tableCurrentY, rowHeight);
                 addCellText(doc, vaccine.vaccine_type, 0, tableCurrentY, rowHeight, 'left');
                 addCellText(doc, vaccine.vaccine_doses.toString(), 1, tableCurrentY, rowHeight, 'center');
                 addCellText(doc, vaccine.vaccine_date, 2, tableCurrentY, rowHeight, 'center');
                 tableCurrentY += rowHeight;
             });
        } else {
             if (tableCurrentY + rowHeight > doc.page.height - (doc.page.margins.bottom || 50)) {
                 doc.addPage(); tableCurrentY = doc.y;
             }
             drawTableRow(doc, tableCurrentY, rowHeight);
             addCellText(doc, 'No vaccination records found.', 0, tableCurrentY, rowHeight, 'center');
             tableCurrentY += rowHeight;
        }
        doc.y = tableCurrentY; 
        doc.moveDown(1.0);


        // Medical Information Section 
        addSectionHeader(doc, 'Medical Information');
        const medSectionStartY = doc.y; 
        let medLeftY = medSectionStartY;
        let medRightY = medSectionStartY; 
 
        medLeftY = addLabeledText(doc, 'Weight', petData.record_weight ? `${petData.record_weight} kg` : 'N/A', leftColumnX, medLeftY, { columnWidth: columnWidth });
        medLeftY = addLabeledText(doc, 'Temperature', petData.record_temp ? `${petData.record_temp} °C` : 'N/A', leftColumnX, medLeftY, { columnWidth: columnWidth });
 
        const conditionStartY = medLeftY;
        const conditionLabel = 'Condition:';
        const conditionValue = ` ${petData.record_condition || 'N/A'}`;  
        doc.font('Helvetica-Bold').fontSize(10).text(conditionLabel, leftColumnX, conditionStartY, { continued: true, baseline: 'top' });
        let conditionLabelWidth;
         if (typeof doc.measureString === 'function') {
             conditionLabelWidth = doc.font('Helvetica-Bold').fontSize(10).measureString(conditionLabel).width;
         } else {
             conditionLabelWidth = doc.font('Helvetica-Bold').fontSize(10).widthOfString(conditionLabel);
         }
        const conditionValueWidth = Math.max(1, columnWidth - conditionLabelWidth - 2);
        doc.font('Helvetica').fontSize(10).text(conditionValue, { 
            width: conditionValueWidth,
            baseline: 'top'
        });
        medLeftY = doc.y + 2; 
        
        const symptomsStartY = medLeftY;
        const symptomsLabel = 'Symptoms:';
        const symptomsValue = ` ${petData.record_symptom || 'N/A'}`;    
        doc.font('Helvetica-Bold').fontSize(10).text(symptomsLabel, leftColumnX, symptomsStartY, { continued: true, baseline: 'top' });
        let symptomsLabelWidth;
         if (typeof doc.measureString === 'function') {
             symptomsLabelWidth = doc.font('Helvetica-Bold').fontSize(10).measureString(symptomsLabel).width;
         } else {
             symptomsLabelWidth = doc.font('Helvetica-Bold').fontSize(10).widthOfString(symptomsLabel);
         }
        const symptomsValueWidth = Math.max(1, columnWidth - symptomsLabelWidth - 2);
        doc.font('Helvetica').fontSize(10).text(symptomsValue, {    
            width: symptomsValueWidth,  
            baseline: 'top'
        });
        medLeftY = doc.y + 2;   

        medLeftY = addLabeledText(doc, 'Laboratories', petData.lab_description || 'N/A', leftColumnX, medLeftY, { columnWidth: columnWidth });

        medLeftY = addLabeledText(doc, 'Surgery History', petData.surgery_id ? 'Yes' : 'No', leftColumnX, medLeftY, { columnWidth: columnWidth });
         if (petData.surgery_id) {
            medLeftY = addLabeledText(doc, 'Surgery Date', petData.surgery_date ? new Date(petData.surgery_date).toLocaleDateString() : 'N/A', leftColumnX, medLeftY, { columnWidth: columnWidth });
            medLeftY = addLabeledText(doc, 'Surgery Type', petData.surgery_type || 'N/A', leftColumnX, medLeftY, { columnWidth: columnWidth });
         }

        doc.y = Math.max(medLeftY, medRightY);
        doc.moveDown(1.0);


        // Latest Diagnosis Section
        addSectionHeader(doc, 'Latest Diagnosis');
        doc.font('Helvetica').fontSize(10).fillColor('black')
           .text(petData.diagnosis_text || 'No diagnosis recorded.', leftMargin, doc.y, {
               width: contentWidth, 
               align: 'left'
           });
        doc.moveDown(1.0);

        addSectionHeader(doc, 'Visit Details');
        let visitY = doc.y;
        visitY = addLabeledText(doc, 'Last Visit', petData.record_recent_visit ? new Date(petData.record_recent_visit).toLocaleDateString() : 'N/A', leftColumnX, visitY, { columnWidth: contentWidth });
        visitY = addLabeledText(doc, 'Purpose', petData.record_purpose || 'N/A', leftColumnX, visitY, { columnWidth: contentWidth }); 
        visitY = addLabeledText(doc, 'Recent Purchase', petData.record_purchase || 'N/A', leftColumnX, visitY, { columnWidth: contentWidth });
        doc.y = visitY;
        doc.moveDown(1.0);

        if (petData.record_lab_file) {
            const imageFilename = petData.record_lab_file.toString().trim();
            const imagePath = path.join(__dirname, "../uploads", imageFilename);
            console.log("Attempting to attach image from path:", imagePath);

            if (fs.existsSync(imagePath)) {
                const imageSpaceEstimate = 250 + 50;
                if (doc.y + imageSpaceEstimate > doc.page.height - (doc.page.margins.bottom || 50)) {
                    console.log("--- Adding page before image");
                    doc.addPage();
                    addSectionHeader(doc, 'Attached Lab File');
                }
                try {
                   const imgOptions = { fit: [contentWidth * 0.8, 250], align: 'center' };
                   const imgWidth = imgOptions.fit[0];
                   const imgX = leftMargin + (contentWidth - imgWidth) / 2;
                   doc.image(imagePath, imgX, doc.y, imgOptions);
                   doc.moveDown(1.0);
                } catch (imgError) {
                    console.error("Error embedding image:", imgError);
                    doc.font('Helvetica').fontSize(10).fillColor('red').text('Error embedding attached lab file.', leftMargin, doc.y, { width: contentWidth });
                    doc.moveDown(1.0);
                }
            } else {
                console.warn("Lab file specified but not found at path:", imagePath);
            }
        } else {
            console.log("No lab file attached to this record.");
        }
 
        console.log("--- Starting Final Elements Addition ---");
        const pageCount = doc.bufferedPageRange().count;
        console.log(`   Document has ${pageCount} pages.`);

        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            console.log(`   Switched to page ${i}`);
            addFooter(doc); 
            if (i === pageCount - 1) { 
                const estimatedSigHeight = 70; 
                if (doc.y + estimatedSigHeight > doc.page.height - (doc.page.margins.bottom || 50) - 30 ) { 
                    console.warn(`   Signature might overlap on page ${i}. Consider adding space or manual page break earlier.`);
                }
                addSignatureArea(doc);
            }
        }
        addPageNumbers(doc); 


        // Finalize PDF 
        doc.end();

        await new Promise((resolve, reject) => {
            stream.on('finish', () => { 
                resolve();
            });
            stream.on('error', (err) => {
                console.error("PDF stream writing error:", err);
                reject(err);
            });
        });

        return pdfPath;

    } catch (error) {
        console.error("Error in generatePdf function:", error);
        if (stream && !stream.closed) {
            stream.end(() => { 
                if (pdfPath && fs.existsSync(pdfPath)) {
                    try { fs.unlinkSync(pdfPath); console.log("Partial PDF file deleted."); }
                    catch (e) { console.error("Error deleting partial PDF file:", e); }
                }
            });
        } else if (pdfPath && fs.existsSync(pdfPath)) {
                try { fs.unlinkSync(pdfPath); console.log("Partial PDF file deleted."); }
                catch (e) { console.error("Error deleting partial PDF file:", e); }
        }
        throw error;
    }
}

module.exports = generatePdf;