import {
  generateConfigKey,
  sanitizeConfigKey,
  getActiveConfigKey,
  setActiveConfigKey,
  saveSprintProgress,
  subscribeToSprintProgress,
  loadLocalSprintState,
  saveSprintToLocalStorage,
  MAX_SPRINT_PAYLOAD_BYTES
} from './sprintService';
import { calculateSprintDayDate } from '../components/Sprint/curriculumData';

jest.mock('./firebase', () => ({
  db: null,
  isFirebaseConfigured: false
}));

describe('sprintService tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('generateConfigKey generates valid room format', () => {
    const key = generateConfigKey();
    expect(key).toMatch(/^s\d{4}$/);
  });

  test('sanitizeConfigKey cleans special characters and spaces', () => {
    expect(sanitizeConfigKey('')).toBe('');
    expect(sanitizeConfigKey(null)).toBe('');
    expect(sanitizeConfigKey('Gaurav_Office-2026!')).toBe('gaurav_office-2026');
    expect(sanitizeConfigKey('   my-sprint   ')).toBe('my-sprint');
  });

  test('getActiveConfigKey and setActiveConfigKey interact with localStorage', () => {
    const key = getActiveConfigKey();
    expect(key).toBeTruthy();
    setActiveConfigKey('office-mac-prep');
    expect(getActiveConfigKey()).toBe('office-mac-prep');
  });

  test('saveSprintToLocalStorage and loadLocalSprintState synchronously persist state', () => {
    const key = 'test-room';
    const payload = {
      completedDsa: { 'dsa-1-1': true },
      flaggedDsa: { 'dsa-1-2': true },
      completedSd: { 'sd-1': true },
      completedDays: { 1: true },
      journals: { 1: { patternNotes: 'Prefix sum invariance', confidence: 4 } },
      darkMode: false
    };

    saveSprintToLocalStorage(key, payload);
    const loaded = loadLocalSprintState(key);

    expect(loaded.completedDsa['dsa-1-1']).toBe(true);
    expect(loaded.flaggedDsa['dsa-1-2']).toBe(true);
    expect(loaded.completedSd['sd-1']).toBe(true);
    expect(loaded.completedDays[1]).toBe(true);
    expect(loaded.journals[1].patternNotes).toBe('Prefix sum invariance');
    expect(loaded.darkMode).toBe(false);
  });

  test('saveSprintProgress enforces size limits and handles offline local mode', async () => {
    const validData = { completedDsa: { 'dsa-1-1': true } };
    const res = await saveSprintProgress('test-key', validData);
    expect(res.success).toBe(true);
    expect(res.localOnly).toBe(true);

    // Overly large payload (> 150 KB)
    const largeData = { blob: 'x'.repeat(MAX_SPRINT_PAYLOAD_BYTES + 100) };
    await expect(saveSprintProgress('test-key', largeData)).rejects.toThrow(/exceeds maximum size/i);
  });

  test('subscribeToSprintProgress degrades gracefully when Firebase is offline', () => {
    const sample = { completedDsa: { 'dsa-2-1': true } };
    saveSprintProgress('test-key', sample);

    let receivedData = null;
    let receivedStatus = null;

    const unsubscribe = subscribeToSprintProgress('test-key', {
      onData: (data) => {
        receivedData = data;
      },
      onStatusChange: (status) => {
        receivedStatus = status;
      }
    });

    expect(typeof unsubscribe).toBe('function');
    expect(receivedStatus).toBe('local');
    expect(receivedData).toEqual(sample);

    unsubscribe();
  });

  test('calculateSprintDayDate dynamically computes dates and weekdays across 40 days', () => {
    // Default startDate '2026-11-17'
    const day1 = calculateSprintDayDate('2026-11-17', 1);
    expect(day1.date).toBe('Nov 17, 2026');
    expect(day1.weekday).toBe('Tue');

    const day6 = calculateSprintDayDate('2026-11-17', 6);
    expect(day6.date).toBe('Nov 22, 2026');
    expect(day6.weekday).toBe('Sun');

    const day40 = calculateSprintDayDate('2026-11-17', 40);
    expect(day40.date).toBe('Dec 26, 2026');
    expect(day40.weekday).toBe('Sat');

    // Custom user startDate (e.g. '2027-01-01')
    const customDay1 = calculateSprintDayDate('2027-01-01', 1);
    expect(customDay1.date).toBe('Jan 1, 2027');
    expect(customDay1.weekday).toBe('Fri');

    const customDay40 = calculateSprintDayDate('2027-01-01', 40);
    expect(customDay40.date).toBe('Feb 9, 2027');
    expect(customDay40.weekday).toBe('Tue');
  });
});
