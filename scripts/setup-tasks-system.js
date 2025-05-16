const { exec } = require("child_process");
const path = require("path");

console.log("🚀 Setting up task management system...\n");

// Function to run scripts sequentially
const runScript = (scriptName) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    console.log(`📝 Running ${scriptName}...`);

    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error executing ${scriptName}:`, error);
        reject(error);
        return;
      }

      if (stderr) {
        console.error(`⚠️ stderr from ${scriptName}:`, stderr);
      }

      console.log(stdout);
      console.log(`✅ ${scriptName} completed successfully!\n`);
      resolve();
    });
  });
};

// Run all setup scripts sequentially
async function setupTasksSystem() {
  try {
    // Step 0: Set up the exec_sql stored procedure first (needed by other scripts)
    await runScript("apply-exec-sql-procedure.js");

    // Step 1: Create the database tables
    await runScript("apply-task-tables.js");

    // Step 2: Set up storage buckets
    await runScript("create-storage-buckets.js");

    console.log("🎉 Task management system setup completed successfully!");
    console.log(
      "You can now use the task management features in your application."
    );
  } catch (error) {
    console.error("❌ Task management system setup failed.");
    console.error("Please check the error messages above and try again.");
    process.exit(1);
  }
}

// Execute the setup function
setupTasksSystem();
