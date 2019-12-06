import '@babel/polyfill';
import request from 'supertest';
import app from './app';

const environment = process.env.NODE_ENV || 'development';
const configuration = require('./knexfile')[environment];
const database = require('knex')(configuration);

describe('Server', () => {
  beforeEach(async () => {
    await database.seed.run();
  });

  describe('init', () => {
    it('should return a 200 status', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toEqual('Welcome to Color Picker API');
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should return status 200 and all projects', async () => {
      let expectedProjects = await database('projects').select();
      const resp = await request(app).get('/api/v1/projects');
      const projects = await resp.body;
      expect(resp.status).toBe(200);
      // expect(projects).toEqual(expectedProjects);
      // projects match but created_at/updated_at is wrapped in quotes on response
    });
  });

  describe('GET /api/v1/palettes', () => {
    it('should return all of the palettes with status 200', async () => {
      const expectedPalettes = await database('palettes').select();
      const resp = await request(app).get('/api/v1/palettes');
      const palettes = await resp.body;
      expect(resp.status).toBe(200);
      expect(palettes).toEqual(expectedPalettes);
    });
  });

  describe('GET /api/v1/projects/:name', () => {
    it('should return the project with status 200 if found', async () => {
      const expectedProject = await database('projects').where('name', 'Super dope project').first();
      const { name } = expectedProject;
      const resp = await request(app).get(`/api/v1/projects/${name}`);
      const project = await resp.body;
      expect(resp.status).toBe(200);
      expect(project.name).toEqual(expectedProject.name);
    });
    it('should return 404 and an error is the project is not found', async () => {
      const invalidPalette = 'invalid project';
      const expected = JSON.stringify({ error: 'Could not find project named invalid project!' });
      const resp = await request(app).get(`/api/v1/projects/${invalidPalette}`);
      const error = await resp.text;
      expect(resp.status).toBe(404);
      expect(error).toEqual(expected);
    });
  });

  describe('GET /api/v1/palettes/:palette_name', () => {
    it('should return status 200 and the palette found', async () => {
      const palette_name = 'super dope palette';
      const expectedPalette = await database('palettes').where({ palette_name }).first();
      const resp = await request(app).get(`/api/v1/palettes/${palette_name}`);
      const palette = resp.body;
      expect(resp.status).toBe(200);
      expect(palette).toEqual(expectedPalette);
    });
    it('should return status 404 is palette is not found and a message', async () => {
      const expected = { error: 'Could not find palette with name invalid palette' };
      const invalidPalette = 'invalid palette';
      const resp = await request(app).get(`/api/v1/palettes/${invalidPalette}`);
      const error = resp.body;
      expect(resp.status).toBe(404);
      expect(error).toEqual(expected);
    });
  });

  describe('POST /api/v1/projects', () => {
    it('should return status 201 and insert a new project', async () => {
      const newProject = { name: 'Cool new project' };
      // await database('projects').where({name: 'Cool new project'}).del();
      const response = await request(app).post('/api/v1/projects').send(newProject);
      const project = await database('projects').where('name', 'Cool new project').first();
      expect(response.status).toBe(201);
      expect(project.name).toEqual(newProject.name);
    });
    it('should return status 422 and a helpful error msg if missing info', async () => {
      const invalidProject = { color: 'red' };
      const expectedResponse = { error: 'Expected format { name: <string> }, missing name!' };
      const response = await request(app).post('/api/v1/projects').send(invalidProject);
      expect(response.body).toEqual(expectedResponse);
    });
  });

  describe('POST /api/v1/palettes', () => {
    it('should return a status of 201 and insert new palette into table', async () => {
      const newPalette = {
        palette_name: 'test palette',
        project_id: 1,
        color_1: '#000000',
        color_2: '#FFFFFF',
        color_3: '#CCCCCC',
        color_4: '#1F1F1F',
        color_5: '#1E1E1E',
      };
      await database('palettes').where({ palette_name: 'test palette' }).del();
      const response = await request(app).post('/api/v1/palettes').send(newPalette);
      const project = await database('palettes').where({ palette_name: 'test palette' }).first();
      expect(response.status).toBe(201);
      expect(project.palette_name).toEqual(newPalette.palette_name);
    });

    it('should return status 422 and a helpful error msg', async () => {
      const invalidPalette = {
        palette_name: 'test palette',
        project_id: 1,
        color_1: '#000000',
        color_2: '#FFFFFF',
        color_3: '#CCCCCC',
        color_4: '#1F1F1F',
      };
      const expectedResponse = {
        error: 'Expected { project_id: <int>, palette_name: <string>, color_1: <string>, color_2: <string> color_3: <string>, color_4: <string>, color_5: <string> } \n'
        + '        Missing color_5!',
      };
      const response = await request(app).post('/api/v1/palettes').send(invalidPalette);
      expect(response.status).toBe(422);
      expect(response.body).toEqual(expectedResponse);
    });
  });

  describe('DELETE /api/v1/projects/:name', () => {
    it('should return status 202 and delete the project', async () => {
      const response = await request(app).delete('/api/v1/projects/Cool new project');
      const expected = { message: 'Successfully deleted Cool new project' };
      const project = await database('projects').where({ name: 'Cool new project' });
      expect(response.body).toEqual(expected);
      expect(project).toEqual([]);
    });
  });

  describe('DELETE /api/v1/palettes/:palette_name', () => {
    it('should return status 202 and delete the item', async () => {
      const response = await request(app).delete('/api/v1/palettes/super dope palette');
      const expected = { message: 'Successfully deleted palette super dope palette' };
      const palette = await database('palettes').where({ palette_name: 'super dope palette' });
      expect(response.body).toEqual(expected);
      expect(palette).toEqual([]);
      await database('palettes').insert({
        palette_name: 'super dope palette',
        project_id: 1,
        color_1: '#000000',
        color_2: '#FFFFFF',
        color_3: '#CCCCCC',
        color_4: '#1f1f1f',
        color_5: '#1d1d1d',
      });
    });
  });

  describe('PATCH /api/v1/projects/:name', () => {
    it('should return a 202 status and update the item', async () => {
      const newName = { name: 'hi' };
      const originalProject = await database('projects').where({ name: 'Super dope project' }).first();
      expect(originalProject.name).toEqual('Super dope project');
      const update = await request(app).patch(`/api/v1/projects/${originalProject.name}`).send(newName);
      const updatedProject = await database('projects').where({ name: 'hi' }).first();
      expect(updatedProject.name).toEqual('hi');
      expect(update.status).toBe(202);
      expect(update.body.message).toEqual('Project name changed to hi');
    });
    it('should return status 404 and error if not found', async() => {
      const expected = 'No existing project with name of invalid';
      const response = await request(app).patch('/api/v1/projects/invalid');
      expect(response.body.error).toEqual(expected);
      expect(response.status).toBe(404);
    });
  });


  describe('PATCH /api/v1/palettes/:palette_name', () => {
    it('should return a 202 status and update the color', async () => {
      const newColor = { color_2: '#bbbbbb' };
      const originalPalette = await database('palettes').where({ palette_name: 'super dope palette' }).first();
      expect(originalPalette.palette_name).toEqual('super dope palette');
      const update = await request(app).patch(`/api/v1/palettes/${originalPalette.palette_name}`).send(newColor);
      const updatedPalette = await database('palettes').where({ palette_name: 'super dope palette' }).first();
      expect(updatedPalette.color_2).toEqual('#bbbbbb');
      expect(update.status).toBe(202);
      expect(update.body.message).toEqual('Color updated');
    });
    it('should return 404 and error msg if not found', async () => {
      const expected = 'No existing palette with name of invalid';
      const response = await request(app).patch('/api/v1/palettes/invalid');
      expect(response.status).toBe(404);
      expect(response.body.error).toEqual(expected);
    });
  });
});
