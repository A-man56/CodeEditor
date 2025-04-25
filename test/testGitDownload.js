const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs-extra');

const git = simpleGit();  // Initialize simple-git
const repo = 'https://github.com/A-man56/code-templates.git';
const projectFolder = path.join(__dirname, 'test-project');
const cppFolder = path.join(projectFolder, 'cpp');

// Clone the repo
git.clone(repo, projectFolder, (err) => {
  if (err) {
    console.error('Error downloading repo:', err);
  } else {
    console.log('Repository cloned successfully');

    // Locate the cpp folder and copy it to the destination
    const cppSource = path.join(projectFolder, 'code-templates', 'cpp');  // Adjust path after clone
    if (fs.existsSync(cppSource)) {
      fs.copySync(cppSource, cppFolder);
      console.log('C++ template copied successfully');
    } else {
      console.error('C++ folder does not exist in the downloaded template');
    }
  }
});
