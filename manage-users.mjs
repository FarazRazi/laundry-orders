#!/usr/bin/env node
// Manage who can sign in to the laundry app. Only the developer runs this.
//
//   node manage-users.mjs list
//   node manage-users.mjs add <username> ["Shop name"]   create a user (random password printed once)
//   node manage-users.mjs passwd <username>              give a user a new random password
//   node manage-users.mjs passwd <username> --ask        type the new password yourself (min 10 chars)
//   node manage-users.mjs disable <username>             block sign-in, keep the account
//   node manage-users.mjs enable <username>
//   node manage-users.mjs remove <username>
//
// Then publish:  git commit -am "update users" && git push
// Devices pick up the change the next time they're online (GitHub Pages caches up to ~10 min).
// Changing a password, disabling or removing a user signs out every device using that account.
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FILE = join(dirname(fileURLToPath(import.meta.url)), 'users.json');
const ITER = 600000; // PBKDF2-SHA256 rounds; each user stores its own count, so this can be raised later
const load = () => existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { users: [] };
const save = d => writeFileSync(FILE, JSON.stringify(d, null, 2) + '\n');
const hash = (pass, salt, iter) => pbkdf2Sync(pass, Buffer.from(salt, 'hex'), iter, 32, 'sha256').toString('hex');
// readable random password: no 0/O/1/l/I
const genPass = () => { const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'; const b = randomBytes(14); return [...b].map(x => a[x % a.length]).join('').replace(/(.{5})(?=.)/g, '$1-'); };
const ask = q => new Promise(res => { const rl = createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, a => { rl.close(); res(a); }); });
const die = m => { console.error(m); process.exit(1); };

function setPassword(user, pass) {
  user.salt = randomBytes(16).toString('hex');
  user.iter = ITER;
  user.hash = hash(pass, user.salt, ITER);
  user.changed = new Date().toISOString().slice(0, 10);
}
async function newPassword() {
  if (!process.argv.includes('--ask')) return genPass();
  const p = await ask('New password (min 10 chars): ');
  if (p.length < 10) die('Too short. Passwords are checked against a public hash, so use at least 10 characters.');
  return p;
}

const [cmd, rawName, shop] = process.argv.slice(2).filter(a => a !== '--ask');
const name = (rawName || '').trim().toLowerCase();
const d = load();
const find = () => d.users.find(u => u.u === name) || die(`No user "${name}".`);
const need = () => name || die('Give a username.');

switch (cmd) {
  case 'list':
    if (!d.users.length) console.log('No users yet.');
    for (const u of d.users) console.log(`${u.u.padEnd(16)} ${u.disabled ? 'DISABLED' : 'active  '}  ${u.shop || ''}  (password set ${u.changed || '?'})`);
    break;
  case 'add': {
    need(); if (!/^[a-z0-9._-]{3,32}$/.test(name)) die('Username: 3-32 chars, a-z 0-9 . _ -');
    if (d.users.some(u => u.u === name)) die(`"${name}" already exists. Use passwd to reset it.`);
    const user = { u: name, ...(shop ? { shop } : {}) }; const pass = await newPassword();
    setPassword(user, pass); d.users.push(user); save(d);
    console.log(`Added ${name}\nPassword: ${pass}\nGive this to the user now; it isn't stored anywhere. Then: git commit -am "add ${name}" && git push`);
    break;
  }
  case 'passwd': {
    need(); const user = find(); const pass = await newPassword(); setPassword(user, pass); save(d);
    console.log(`New password for ${name}: ${pass}\nThen push. Devices signed in as ${name} will be asked to sign in again.`);
    break;
  }
  case 'disable': case 'enable':
    need(); find().disabled = cmd === 'disable'; if (cmd === 'enable') delete find().disabled; save(d);
    console.log(`${name} ${cmd}d. Push to apply.`); break;
  case 'remove':
    need(); find(); d.users = d.users.filter(u => u.u !== name); save(d);
    console.log(`${name} removed. Push to apply.`); break;
  default:
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 15).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
}
