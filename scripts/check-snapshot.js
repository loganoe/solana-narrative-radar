import { readFile } from 'node:fs/promises';

const snapshot = JSON.parse(await readFile('data/snapshot.json', 'utf8'));

const errors = [];

if (!snapshot.generatedAt || Number.isNaN(Date.parse(snapshot.generatedAt))) {
  errors.push('generatedAt is missing or invalid');
}

if (!Array.isArray(snapshot.sources) || snapshot.sources.length < 3) {
  errors.push('expected at least three sources');
}

if (!Array.isArray(snapshot.narratives) || snapshot.narratives.length < 3) {
  errors.push('expected at least three narratives');
}

for (const narrative of snapshot.narratives || []) {
  if (!narrative.title || !narrative.summary || !Number.isFinite(Number(narrative.score))) {
    errors.push(`narrative is incomplete: ${narrative.id || 'unknown'}`);
  }
  if (!Array.isArray(narrative.evidence) || narrative.evidence.length === 0) {
    errors.push(`narrative has no evidence: ${narrative.id || 'unknown'}`);
  }
  if (!Array.isArray(narrative.ideas) || narrative.ideas.length === 0) {
    errors.push(`narrative has no build ideas: ${narrative.id || 'unknown'}`);
  }
}

if (!Array.isArray(snapshot.signals?.tokens) || snapshot.signals.tokens.length < 10) {
  errors.push('expected at least ten token signals');
}

if (!Array.isArray(snapshot.signals?.repositories) || snapshot.signals.repositories.length < 5) {
  errors.push('expected at least five repository signals');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Snapshot OK: ${snapshot.narratives.length} narratives, ${snapshot.signals.tokens.length} token signals, ${snapshot.signals.repositories.length} repositories.`);
