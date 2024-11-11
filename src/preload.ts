import { exec, spawn } from "child_process";
import { contextBridge } from "electron";
import fs from "fs";
import path from "path";
import os from "os";

// Define a type for shutdown schedule entries
interface ShutdownSchedule {
  taskName: string;
  timestamp: number;
  delayInSeconds: number;
  scheduledTime: string;
  enabled: boolean;
  scheduleType: "once" | "daily" | "weekly";
  daysOfWeek?: string[];
}

// Paths and constants
// const shutdownSchedulesPath = path.join(
//   process.cwd(),
//   "shutdownSchedules.json"
// );
const shutdownSchedulesPath = path.join(__dirname, "shutdownSchedules.json");
const taskNamePrefix = "ElectronShutdownTask";
const isWindows = os.platform() === "win32";
const isMacOS = os.platform() === "darwin";
const isLinux = os.platform() === "linux";
const isUnix = !isMacOS && !isLinux && !isWindows;

// Helper function to load schedules from a JSON file
const loadSchedules = (): ShutdownSchedule[] => {
  if (fs.existsSync(shutdownSchedulesPath)) {
    const data = fs.readFileSync(shutdownSchedulesPath, "utf-8");
    return JSON.parse(data) as ShutdownSchedule[];
  }
  return [];
};

// Helper function to save schedules to a JSON file
const saveSchedules = (schedules: ShutdownSchedule[]): void => {
  fs.writeFileSync(shutdownSchedulesPath, JSON.stringify(schedules, null, 2));
};

// Helper function to format cron time strings for scheduling
const formatCronTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();
  return `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`;
};

const enableCronTask = (taskName: string) => {
  exec(`crontab -l`, (error, stdout) => {
    if (error) {
      console.error(`Error reading crontab: ${error.message}`);
      return;
    }

    // Enable cron job by uncommenting the line after the task name comment
    const updatedCron = stdout
      .split("\n")
      .map((line, index, lines) => {
        // Find the task name comment and uncomment the next line if it’s commented
        if (
          line.trim() === `# ${taskName}` &&
          lines[index + 1]?.startsWith("#")
        ) {
          lines[index + 1] = lines[index + 1].replace(/^#\s*/, ""); // Uncomment the cron line
        }
        return line;
      })
      .join("\n");

    exec(`echo "${updatedCron}" | crontab -`, (error) => {
      if (error) {
        console.error(
          `Error enabling cron job for ${taskName}: ${error.message}`
        );
      } else {
        console.log(`Cron job ${taskName} enabled.`);
      }
    });
  });
};

const disableCronTask = (taskName: string) => {
  exec(`crontab -l`, (error, stdout) => {
    if (error) {
      console.error(`Error reading crontab: ${error.message}`);
      return;
    }

    // Disable cron job by commenting out the line after the task name comment
    const updatedCron = stdout
      .split("\n")
      .map((line, index, lines) => {
        // Find the task name comment and comment the next line if it’s uncommented
        if (
          line.trim() === `# ${taskName}` &&
          !lines[index + 1]?.startsWith("#")
        ) {
          lines[index + 1] = `# ${lines[index + 1]}`; // Comment out the cron line
        }
        return line;
      })
      .join("\n");

    exec(`echo "${updatedCron}" | crontab -`, (error) => {
      if (error) {
        console.error(
          `Error disabling cron job for ${taskName}: ${error.message}`
        );
      } else {
        console.log(`Cron job ${taskName} disabled.`);
      }
    });
  });
};

// Shutdown scheduling and management API
export const bridgeApi = {
  listShutdownSchedules: (): ShutdownSchedule[] => {
    console.log(loadSchedules());

    return loadSchedules().map((schedule) => ({
      ...schedule,
      scheduledTime: new Date(schedule.timestamp).toLocaleString(),
    }));
  },

  setShutdownTimerTask: ({
    delayInSeconds,
    delayInMinutes = 0,
    delayInHours = 0,
    delayInDays = 0,
    action = "shutdown",
    scheduleType = "once",
    daysOfWeek = [],
    enabled = true,
  }: {
    delayInSeconds: number;
    delayInMinutes?: number;
    delayInHours?: number;
    delayInDays?: number;
    action: "shutdown" | "reboot";
    scheduleType: "once" | "daily" | "weekly";
    daysOfWeek?: string[];
    enabled?: boolean;
  }): void => {
    const delayInMilliseconds =
      (delayInSeconds > 0 && delayInSeconds <= 60 ? 61 : delayInSeconds) *
        1000 +
      (delayInMinutes === 1 ? delayInMinutes + 1 : delayInMinutes) * 60 * 1000 +
      delayInHours * 60 * 60 * 1000 +
      delayInDays * 24 * 60 * 60 * 1000;

    // Calculate the future timestamp based on the total delay
    const timestamp = Date.now() + delayInMilliseconds;
    const taskName = `${taskNamePrefix}_${timestamp}`;
    const scheduledTime = new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
    });

    const schedules = loadSchedules();
    schedules.push({
      taskName,
      timestamp,
      delayInSeconds,
      scheduledTime,
      enabled,
      scheduleType,
      daysOfWeek,
    });
    saveSchedules(schedules);

    if (!enabled) {
      console.log(`Task ${taskName} saved but not enabled.`);
      return;
    }

    if (isWindows) {
      // Windows scheduling with schtasks remains the same
      const command =
        action === "shutdown"
          ? `shutdown -s -f -t ${Math.floor(delayInMilliseconds / 1000)}`
          : `shutdown -r -f -t ${Math.floor(delayInMilliseconds / 1000)}`;

      let schtasksCommand = `schtasks /create /tn ${taskName} /tr "${command}" /st ${scheduledTime}`;
      if (scheduleType === "daily") {
        schtasksCommand += " /sc daily";
      } else if (scheduleType === "weekly" && daysOfWeek.length > 0) {
        schtasksCommand += ` /sc weekly /d ${daysOfWeek.join(",")}`;
      } else {
        schtasksCommand += " /sc once";
      }

      exec(schtasksCommand, (error) => {
        if (error) {
          console.error(`Error setting ${action} timer: ${error.message}`);
        } else {
          console.log(`${action} timer set for ${delayInSeconds} seconds`);
        }
      });
    } else if (isMacOS || isLinux || isUnix) {
      // const command = action === "shutdown" ? "poweroff" : "reboot";
      let command = "";
      if (isMacOS) {
        command =
          action === "shutdown"
            ? `/usr/bin/osascript -e 'tell application \\"System Events\\" to shut down'`
            : // ? "/sbin/shutdown -h now >> /Users/hichemfantar/github_projects/my-timer-app/cron_output.log"
              `/usr/bin/osascript -e 'tell application \\"System Events\\" to restart'`;
      } else {
        command = action === "shutdown" ? "poweroff" : "reboot";
        // action === "shutdown"
        // ? "/sbin/shutdown -h now"
        // : "/sbin/shutdown -r now";
      }

      if (scheduleType === "once") {
        // Use `at` command for one-time scheduling
        const atTime = new Date(timestamp).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        console.log(`echo "${command}" | at ${atTime}`);

        exec(`echo "${command}" | at ${atTime}`, (error) => {
          if (error) {
            console.error(
              `Error setting one-time ${action} with 'at' command: ${error.message}`
            );
          } else {
            console.log(`${action} set for once at ${atTime}`);
          }
        });
      } else {
        // Handle daily or weekly scheduling with cron
        const cronTime = formatCronTime(timestamp);

        let cronJob = `${cronTime} ${command}`;
        if (scheduleType === "daily") {
          cronJob = `0 ${new Date(timestamp).getHours()} * * * ${command}`;
        } else if (scheduleType === "weekly" && daysOfWeek.length > 0) {
          cronJob = `0 ${new Date(timestamp).getHours()} * * ${daysOfWeek
            .map((day) => day.slice(0, 3))
            .join(",")} ${command}`;
        }

        const cronEntry = `# ${taskName}\n${cronJob}`;
        exec(
          `(crontab -l; echo "${cronEntry}") | crontab -`,
          {
            shell: "/bin/bash",
          },
          (error) => {
            if (error) {
              console.error(
                `Error setting ${scheduleType} ${action} cron job: ${error.message}`
              );
            } else {
              console.log(
                `${scheduleType} cron job set for ${delayInSeconds} seconds`
              );
            }
          }
        );
      }
    }
  },
  cancelShutdownTask: (taskName: string): void => {
    const schedules = loadSchedules();
    const taskIndex = schedules.findIndex(
      (schedule) => schedule.taskName === taskName
    );

    if (taskIndex !== -1) {
      if (isWindows) {
        exec(`schtasks /delete /tn ${taskName} /f`, (error) => {
          if (error) {
            console.error(
              `Error canceling shutdown for task ${taskName}: ${error.message}`
            );
          } else {
            schedules.splice(taskIndex, 1);
            saveSchedules(schedules);
            console.log(`Shutdown canceled successfully for task ${taskName}`);
          }
        });
      } else {
        exec(
          `crontab -l | sed '/# ${taskName}/,/^$/d' | crontab -`,
          (error) => {
            if (error) {
              console.error(
                `Error removing cron job for ${taskName}: ${error.message}`
              );
            } else {
              schedules.splice(taskIndex, 1);
              saveSchedules(schedules);
              console.log(`Cron job canceled for ${taskName}`);
            }
          }
        );
      }
    } else {
      console.log(`No task found with name ${taskName}`);
    }
  },

  cancelAllShutdowns: (): void => {
    const schedules = loadSchedules();
    if (isWindows) {
      schedules.forEach(({ taskName }) => {
        exec(`schtasks /delete /tn ${taskName} /f`, (error) => {
          if (error) {
            console.error(
              `Error canceling shutdown for task ${taskName}: ${error.message}`
            );
          } else {
            console.log(`Shutdown canceled for ${taskName}`);
          }
        });
      });
    } else {
      exec("crontab -l", (error, stdout) => {
        if (error) {
          console.error(`Error listing cron jobs: ${error.message}`);
          return;
        }

        const updatedCron = stdout
          .split("\n")
          .filter((line) => !line.startsWith(`# ${taskNamePrefix}_`))
          .join("\n");

        exec(`echo "${updatedCron}" | crontab -`, (error) => {
          if (error) {
            console.error(
              `Error updating crontab to remove shutdown tasks: ${error.message}`
            );
          } else {
            console.log("All shutdown-related cron jobs canceled.");
          }
        });
      });
    }
    saveSchedules([]);
  },

  enableTask: (taskName: string) => {
    const schedules = loadSchedules();
    const schedule = schedules.find((s) => s.taskName === taskName);

    if (!schedule) {
      console.log(`Task ${taskName} not found.`);
      return;
    }

    if (isWindows) {
      exec(`schtasks /change /tn ${taskName} /enable`, (error) => {
        if (error) {
          console.error(`Error enabling task ${taskName}: ${error.message}`);
          return;
        }
        schedule.enabled = true;
        saveSchedules(schedules);
        console.log(`Task ${taskName} enabled successfully.`);
      });
    } else {
      enableCronTask(taskName);
      schedule.enabled = true;
      saveSchedules(schedules);
    }
  },

  disableTask: (taskName: string) => {
    const schedules = loadSchedules();
    const schedule = schedules.find((s) => s.taskName === taskName);

    if (!schedule) {
      console.log(`Task ${taskName} not found.`);
      return;
    }

    if (isWindows) {
      exec(`schtasks /change /tn ${taskName} /disable`, (error) => {
        if (error) {
          console.error(`Error disabling task ${taskName}: ${error.message}`);
          return;
        }
        schedule.enabled = false;
        saveSchedules(schedules);
        console.log(`Task ${taskName} disabled successfully.`);
      });
    } else {
      disableCronTask(taskName);
      schedule.enabled = false;
      saveSchedules(schedules);
    }
  },

  enableAll: () => {
    const schedules = loadSchedules();
    schedules.forEach((schedule) => {
      if (isWindows) {
        exec(`schtasks /change /tn ${schedule.taskName} /enable`, (error) => {
          if (error) {
            console.error(
              `Error enabling task ${schedule.taskName}: ${error.message}`
            );
          }
        });
      } else {
        enableCronTask(schedule.taskName);
      }
      schedule.enabled = true;
    });
    saveSchedules(schedules);
    console.log("All tasks enabled successfully.");
  },

  disableAll: () => {
    const schedules = loadSchedules();
    schedules.forEach((schedule) => {
      if (isWindows) {
        exec(`schtasks /change /tn ${schedule.taskName} /disable`, (error) => {
          if (error) {
            console.error(
              `Error disabling task ${schedule.taskName}: ${error.message}`
            );
          }
        });
      } else {
        disableCronTask(schedule.taskName);
      }
      schedule.enabled = false;
    });
    saveSchedules(schedules);
    console.log("All tasks disabled successfully.");
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("bridge", bridgeApi);
