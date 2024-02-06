const core = require('@actions/core');
const exec = require('@actions/exec');
const os = require('os');
const fs = require('fs');
const path = require('path');


async function run() {
  try {
    const kustomizeVersion = core.getInput('kustomize_version', {required: true});
    const architecture = core.getInput('architecture', {required: true});
    const kustomizationDirectory = core.getInput('kustomize_directory', {required: true});
    const outputPath = core.getInput('output_kustomize_yaml_path', {required: true})
    const kustomizePath = path.join(process.env.GITHUB_WORKSPACE, 'kustomize');

    // Download Kustomize
    await exec.exec(`curl -sLO https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize/${kustomizeVersion}/kustomize_${kustomizeVersion}_${architecture}.tar.gz`);
    await exec.exec(`tar xzf ./kustomize_${kustomizeVersion}_${architecture}.tar.gz -C ${process.env.GITHUB_WORKSPACE}`);

    // Build Kustomize Configuration and process it with envsubst
    // Save the result to a temporary file
    const tempFile = path.join(os.tmpdir(), 'kustomize_output.yaml');
    await exec.exec(`${kustomizePath} ${kustomizationDirectory} > ${tempFile}`);
    await exec.exec(`cat ${tempFile} | envsubst > ${tempFile}`);

    try {
      fs.writeFileSync(outputPath, fs.readFileSync(tempFile));
    } catch (error) {
      core.setFailed(`Failed to write to ${outputPath}: ${error}`);
    }

    // Clean up the temporary file
    try {
      fs.unlinkSync(tempFile);
    } catch (error) {
      core.warning(`Failed to delete temporary file ${tempFile}: ${error}`);
    }

    // Set output
    core.setOutput('kustomize_yaml_path', outputPath);
  } catch (error) {
    core.setFailed(error.message);
  }
}