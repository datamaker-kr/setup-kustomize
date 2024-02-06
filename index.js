const core = require('@actions/core');
const exec = require('@actions/exec');
const os = require('os');
const fs = require('fs');
const path = require('path');
const commandExists = require('command-exists');


async function run() {
  try {
    const kustomizeVersion = core.getInput('kustomize_version', {required: true});
    const architecture = core.getInput('architecture', {required: true});
    const kustomizationDirectory = path.join(process.env.GITHUB_WORKSPACE, core.getInput('kustomize_directory', {required: true}));
    const outputPath = core.getInput('output_path', {required: true})
    const kustomizePath = path.join(process.env.GITHUB_WORKSPACE, 'kustomize');

    // Build Kustomize Configuration and process it with envsubst
    // Save the result to a temporary file
    const tempFile = path.join(os.tmpdir(), 'kustomize_output.yaml');

    const kubectlInstalled = await commandExists('kubectl');
    if (!kubectlInstalled) {
      if (!fs.existsSync(kustomizePath)) {
        // Download Kustomize
        core.debug(`Downloading kustomize version ${kustomizeVersion} for ${architecture}`);
        await exec.exec(`curl -sLO https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize/${kustomizeVersion}/kustomize_${kustomizeVersion}_${architecture}.tar.gz`);
        await exec.exec(`tar xzf ./kustomize_${kustomizeVersion}_${architecture}.tar.gz -C ${process.env.GITHUB_WORKSPACE}`);
      }

      core.debug(`Running command: \`${kustomizePath} build ${kustomizationDirectory} -o ${tempFile}\``);
      await exec.exec(`${kustomizePath} build ${kustomizationDirectory} -o ${tempFile}`);
    } else {
      core.debug(`Running command: \`kubectl kustomize ${kustomizationDirectory} -o ${tempFile}\``);
      await exec.exec(`kubectl kustomize ${kustomizationDirectory} -o ${tempFile}`);
    }

    await exec.exec(`bash -c "cat ${tempFile} | envsubst > ${outputPath}"`, function (error, stdout, stderr) {
      if (error) {
        core.setFailed(`Failed to process kustomize output with envsubst: ${error}`);
      }

      try {
        fs.writeFile(outputPath, stdout);
      } catch (error) {
        core.setFailed(`Failed to write to ${outputPath}: ${error}`);
      }

      fs.unlink(tempFile);
    })


    core.debug(`Setting output 'result' to ${outputPath}`)
    core.setOutput('result', outputPath);

    // Clean up the temporary file
    try {
      fs.unlinkSync(tempFile);
    } catch (error) {
      core.warning(`Failed to delete temporary file ${tempFile}: ${error}`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();