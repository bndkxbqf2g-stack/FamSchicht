import {isTaskLikeEntry, normalizeCompletedDates} from './task-planning.js';

const REWARDS_STORAGE_KEY = 'famschicht-rewards-v1';
const MAX_REWARDS = 50;

export function normalizeReward(reward) {
  const id = String(reward?.id || '').trim();
  const title = String(reward?.title || '').trim();
  const points = normalizePoints(reward?.points);
  if (!id || id.length > 120) throw new Error('reward id is required');
  if (!title || title.length > 120) throw new Error('reward title must be between 1 and 120 characters');
  if (points === null || points < 1) throw new Error('reward points must be between 1 and 10000');
  return {id, title, points};
}

export function normalizePoints(value, {allowZero = false} = {}) {
  const raw = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  if (raw === '' || raw === null || raw === undefined) return allowZero ? 0 : null;
  const points = Number(raw);
  if (!Number.isInteger(points) || points < (allowZero ? 0 : 1) || points > 10000) return null;
  return points;
}

export function loadRewardState(storage = defaultStorage()) {
  if (!storage) return {rewards: [], status: 'unavailable'};
  try {
    const raw = storage.getItem(REWARDS_STORAGE_KEY);
    if (!raw) return {rewards: [], status: 'empty'};
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_REWARDS) {
      return {rewards: [], status: 'corrupt'};
    }
    const rewards = parsed.map(normalizeReward);
    if (new Set(rewards.map(reward => reward.id)).size !== rewards.length) {
      return {rewards: [], status: 'corrupt'};
    }
    return {rewards, status: 'loaded'};
  } catch {
    return {rewards: [], status: 'corrupt'};
  }
}

export function saveRewardState(rewards, storage = defaultStorage()) {
  const normalized = normalizeRewardList(rewards);
  if (!storage) throw new Error('Lokaler Speicher ist in diesem Browser nicht verfügbar.');
  try {
    storage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    throw new Error('Belohnungen konnten nicht lokal gespeichert werden.');
  }
  return normalized;
}

export function upsertReward(rewards, reward) {
  const normalized = normalizeReward(reward);
  const current = normalizeRewardList(rewards);
  const index = current.findIndex(item => item.id === normalized.id);
  if (index >= 0) current[index] = normalized;
  else current.push(normalized);
  return current.slice(-MAX_REWARDS);
}

export function removeReward(rewards, rewardId) {
  const id = String(rewardId || '').trim();
  return normalizeRewardList(rewards).filter(reward => reward.id !== id);
}

export function pointsForCompletedTask(entry) {
  if (!isTaskLikeEntry(entry)) return 0;
  const points = normalizePoints(entry.points, {allowZero: true}) || 0;
  if (!points) return 0;
  const completedDates = normalizeCompletedDates(entry.completedDates);
  if (completedDates.length) return completedDates.length * points;
  return entry.completed === true ? points : 0;
}

export function pointsByMember(entries = [], members = []) {
  const totals = new Map((members || []).map(member => [member.id, {
    memberId: member.id,
    name: member.name,
    points: 0,
  }]));
  let sharedPoints = 0;
  for (const entry of entries || []) {
    const points = pointsForCompletedTask(entry);
    if (!points) continue;
    const member = totals.get(entry.ownerId);
    if (member) member.points += points;
    else sharedPoints += points;
  }
  const result = [...totals.values()];
  if (sharedPoints) result.push({memberId: 'shared', name: 'Gemeinsam', points: sharedPoints});
  return result;
}

export function rewardProgress(points, reward) {
  const target = normalizeReward(reward).points;
  const current = Math.max(0, Number(points) || 0);
  return {
    points: current,
    target,
    remaining: Math.max(0, target - current),
    complete: current >= target,
    percent: Math.min(100, Math.round((current / target) * 100)),
  };
}

function normalizeRewardList(rewards) {
  if (!Array.isArray(rewards) || rewards.length > MAX_REWARDS) {
    throw new Error('too many rewards');
  }
  const normalized = rewards.map(normalizeReward);
  if (new Set(normalized.map(reward => reward.id)).size !== normalized.length) {
    throw new Error('duplicate reward id');
  }
  return normalized;
}

function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

