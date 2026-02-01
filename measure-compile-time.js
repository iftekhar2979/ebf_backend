const { exec } = require("child_process");
const fs = require("fs");

// Function to count TypeScript files in the project
function countFiles(dir, fileExtension) {
  let fileCount = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = `${dir}/${file}`;
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      fileCount += countFiles(fullPath, fileExtension);
    } else if (file.endsWith(fileExtension)) {
      fileCount += 1;
    }
  }
  return fileCount;
}

const start = Date.now();

exec("tsc --project tsconfig.build.json", (error, stdout, stderr) => {
  // exec("npm run build", (error, stdout, stderr) => {
  const end = Date.now();
  const timeTaken = (end - start) / 1000;

  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.log(`stderr: ${stderr}`);
  }
  console.log(stdout);

  const tsFilesCount = countFiles("src", ".ts"); // Assuming your source files are in the 'src' directory

  console.log(`Successfully compiled: ${tsFilesCount} files with tsc (${timeTaken.toFixed(2)} seconds)\n`);
});
