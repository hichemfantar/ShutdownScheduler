// this is the os as source of truth implementation
// ABANDONED because the os doesn't return the time in a standard format but according to the user date format settings

import { contextBridge } from "electron";
import { exec } from "child_process";

// Define a prefix for shutdown tasks
const taskNamePrefix = "ElectronShutdownTask";

// Define the bridge API with `schtasks` as the source of truth
const bridgeApi = {
  getNodeVer: (): string => process.versions.node,
  getChromeVer: (): string => process.versions.chrome,
  getElectronVer: (): string => process.versions.electron,

  setShutdownTimerCommand: (delayInSeconds: number): void => {
    const command = `shutdown -s -t ${delayInSeconds}`;
    exec(command, (error) => {
      if (error) {
        console.error(
          `Error setting shutdown timer with command: ${error.message}`
        );
      } else {
        console.log(
          `Shutdown timer set for ${delayInSeconds} seconds via shutdown command`
        );
      }
    });
  },

  setShutdownTimerTask: (delayInSeconds: number): void => {
    const timestamp = Date.now() + delayInSeconds * 1000;
    const taskName = `${taskNamePrefix}_${timestamp}`;
    const scheduledTime = new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
    });
    const command = `schtasks /create /tn ${taskName} /tr "shutdown -s -f" /sc once /st ${scheduledTime}`;

    exec(command, (error) => {
      if (error) {
        console.error(
          `Error setting shutdown timer with Task Scheduler: ${error.message}`
        );
      } else {
        console.log(
          `Shutdown timer set for ${delayInSeconds} seconds via Task Scheduler`
        );
      }
    });
  },

  cancelShutdown: (): void => {
    // Cancel any shutdown tasks set with `shutdown -a`
    const commandCancelShutdown = "shutdown -a";
    exec(commandCancelShutdown, (error) => {
      if (error) {
        console.error(
          `Error canceling shutdown with shutdown command: ${error.message}`
        );
      } else {
        console.log("Shutdown canceled successfully for shutdown command");
      }
    });

    // Cancel all tasks with the `taskNamePrefix` using `schtasks`
    const listCommand = `schtasks /query /fo LIST`;
    exec(listCommand, (error, stdout) => {
      if (error) {
        console.error(`Error querying tasks: ${error.message}`);
        return;
      }

      const tasks = stdout
        .split("\n")
        .filter((line) => line.includes(taskNamePrefix));
      tasks.forEach((task) => {
        const taskName = task.split(":")[1]?.trim();
        if (taskName) {
          const deleteCommand = `schtasks /delete /tn ${taskName} /f`;
          exec(deleteCommand, (delError) => {
            if (delError) {
              console.error(
                `Error canceling shutdown for task ${taskName}: ${delError.message}`
              );
            } else {
              console.log(`Shutdown task ${taskName} canceled successfully.`);
            }
          });
        }
      });
    });
  },

  listShutdownSchedules: (): Promise<
    Array<{
      taskName: string;
      scheduledTime: string;
    }>
  > => {
    return new Promise((resolve, reject) => {
      const command = `schtasks /query /fo CSV /nh`;
      exec(command, (error, stdout) => {
        if (error) {
          reject(`Error querying scheduled tasks: ${error.message}`);
          return;
        }

        const tasks: Array<{ taskName: string; scheduledTime: string }> = [];

        stdout.split("\n").forEach((line) => {
          const columns = line
            .split('","')
            .map((col) => col.replace(/^"|"$/g, "")); // Remove surrounding quotes
          const [taskName, scheduledTime] = columns; // Adjusted index

          // Filter by tasks with the correct prefix and remove any leading backslash
          if (taskName && taskName.includes(taskNamePrefix)) {
            tasks.push({
              taskName: taskName.replace(/^\\/, ""), // Remove any single leading backslash
              scheduledTime: scheduledTime || "Unknown",
            });
          }
        });

        resolve(tasks);
      });
    });
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("myAPI", bridgeApi);
