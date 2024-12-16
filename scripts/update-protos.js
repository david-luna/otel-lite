import {tmpdir} from 'node:os';
import {execSync} from 'node:child_process';
import {mkdtempSync, cpSync, existsSync, rmSync} from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';


// SCRIPT PARAMS
const REPO_NAME = 'opentelemetry-proto';
const REPO_URL = `https://github.com/open-telemetry/${REPO_NAME}.git`;
const HASH_TAG = 'v1.4.0';

// Get the TOP
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOP = resolve(__dirname, '..');



// Clone the protos
const tempPath = mkdtempSync(tmpdir());
const checkoutPath = `${tempPath}/${REPO_NAME}`;
const sourcePath = join(checkoutPath, 'opentelemetry');
execSync(`git clone --depth 1 --branch ${HASH_TAG} ${REPO_URL}`, {
  cwd: tempPath,
});

// and copy them to the lib (overwrite if needed)
const libPath = resolve(TOP, 'lib');
const protoPath = resolve(TOP, 'lib', 'proto');
if (existsSync(protoPath)) {
  rmSync(protoPath, {recursive: true, force: true});
}
cpSync(sourcePath, libPath, {recursive: true});
