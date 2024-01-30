const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: "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",
});

const owner = "DalackText";
const repo = "Api-Test";

const branch = "main";

function send(data) {
  console.log("Uploading...");
  return new Promise(function (Resolve, Reject) {
    octokit.repos
      .getBranch({
        owner,
        repo,
        branch,
      })
      .then((branchInfo) => {
        // Get the content of the existing file
        octokit.repos
          .getContent({
            owner,
            repo,
            path: "file2.txt",
            ref: branch,
          })
          .then((fileInfo) => {
            const existingFileSha = fileInfo.data.sha;

            // Update the file
            octokit.repos
              .createOrUpdateFileContents({
                owner,
                repo,
                path: "file2.txt",
                message: "Update file.txt",
                content: Buffer.from(JSON.stringify(data)).toString("base64"),
                branch,
                sha: existingFileSha,
              })
              .then((response) => {
                Resolve(response);
              })
              .catch((error) => {
                Reject(error);
              });
          })
          .catch((error) => {
            Reject(error);
          });
      })
      .catch((error) => {
        Reject(error);
      });
  });
}
function get() {
  return new Promise(function (Resolve, Reject) {
    octokit.repos
      .getContent({
        owner,
        repo,
        path: "file2.txt",
        ref: branch,
      })
      .then((response) => {
        const content = Buffer.from(response.data.content, "base64").toString(
          "utf-8"
        );
        Resolve(content);
      })
      .catch((error) => {
        Reject(error);
      });
  });
}
module.exports = {
  get: get,
  upload: send,
};
