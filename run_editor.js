const cp = require('child_process');
const fs = require('fs');
const fsp = fs.promises;
const filePathRegex = /(?:[a-zA-Z]:|\\\\[^\/\\:*?"<>|]+\\[^\/\\:*?"<>|]+)(?:\\[^\/\\:*?"<>|]+)+(?:\.[^\/\\:*?"<>|%\s]+)/;
const protocolRegex = /^phpstorm:\/\/open\/?\?(url=file:\/\/|file=)(.+)&line=(\d+)$/;

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execShellCommand(cmd) {
    return new Promise((resolve, reject) => {
        cp.exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(error)
            }
            resolve(stdout ? stdout : stderr);
        });
    });
}

async function getPhpStormExecutable() {
    try {
        const result = await execShellCommand('where phpstorm');
        const filename = result.replace(/[\r\n]+/g, '');
        await fsp.access(filename, fs.constants.F_OK | fs.constants.R_OK);
        const file = await fsp.readFile(filename, 'utf8');
        return filePathRegex.exec(file)[0];
    } catch (e) {
    }
}

(async function main() {
    let executable = await getPhpStormExecutable();
    const url = protocolRegex.exec(process.argv[2]);
    if (url) {
        let file = decodeURIComponent(url[2]).replace(/\+/g, ' ');
        let search_path = file.replace(/\//g, '\\');
        let project = '';
        while (search_path.lastIndexOf('\\') !== -1) {
            search_path = search_path.substring(0, search_path.lastIndexOf('\\'));
            try {
                if (await fsp.access(search_path + '\\.idea\\.name', fs.constants.F_OK | fs.constants.R_OK)) {
                    project = search_path;
                    break;
                }
            } catch (e) {
            }
        }

        if (project !== '') {
            executable += ' "%project%"';
        }

        executable += ' --line %line% "%file%"';

        const command = executable.replace(/%line%/g, url[3])
            .replace(/%file%/g, file)
            .replace(/%project%/g, project)
            .replace(/\//g, '\\');
        cp.exec(command);
    }
})();



