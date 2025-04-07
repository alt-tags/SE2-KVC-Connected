const request = require('supertest');
const express = require('express');
const session = require('express-session');
const vaccineController = require('../../server/controllers/vaccineController');
const VaccineModel = require('../../server/models/vaccineModel');

jest.mock('../../server/models/vaccineModel');

const app = express();
app.use(express.json());
app.use(session({
  secret: 'testsecret',
  resave: false,
  saveUninitialized: true,
}));

app.post('/vaccinations/:pet_id', vaccineController.addPetVaccinationRecord);

describe('Vaccine Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add a vaccination record successfully', async () => {
    VaccineModel.getVaccineByType.mockResolvedValue({ vax_id: 1 });
    VaccineModel.addPetVaccinationRecord.mockResolvedValue();

    const response = await request(app)
      .post('/vaccinations/1')
      .send({
        vax_type: 'Rabies',
        imm_rec_quantity: 1,
        imm_rec_date: '2022-01-01'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('✅ Vaccination record added successfully!');
  });

  it('should return error if required fields are missing', async () => {
    const response = await request(app)
      .post('/vaccinations/1')
      .send({
        vax_type: 'Rabies'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('❌ Vaccine type and dose quantity are required.');
  });

  it('should return error if vaccine type is invalid', async () => {
    VaccineModel.getVaccineByType.mockResolvedValue(null);

    const response = await request(app)
      .post('/vaccinations/1')
      .send({
        vax_type: 'InvalidVaccine',
        imm_rec_quantity: 1,
        imm_rec_date: '2022-01-01'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('❌ Invalid vaccine type. Please select a valid vaccine.');
  });

  it('should return server error if an exception occurs', async () => {
    VaccineModel.getVaccineByType.mockRejectedValue(new Error('Server error'));

    const response = await request(app)
      .post('/vaccinations/1')
      .send({
        vax_type: 'Rabies',
        imm_rec_quantity: 1,
        imm_rec_date: '2022-01-01'
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('❌ Server error while adding record.');
  });
});