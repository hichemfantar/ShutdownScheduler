import { exec, ExecException, ExecOptions } from "child_process";
import { contextBridge, ipcRenderer } from "electron";
import fs from "fs";
import os from "os";

// Define a type for shutdown schedule entries
interface ShutdownSchedule {
  action: "shutdown" | "reboot";
  taskName: string;
  timestamp: number;
  delayInSeconds: number;
  scheduledTime: string;
  enabled: boolean;
  scheduleType: "once" | "daily" | "weekly";
  daysOfWeek?: string[];
  // Optional job ID for one-time scheduling with `at`
  jobId?: string;
}

export type ExecAsyncError = { error: ExecException; stderr: string };
const execAsync = (command: string, options?: ExecOptions): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve(stdout);
      }
    });
  });
};

// Paths and constants
// const shutdownSchedulesPath = path.join(
//   process.cwd(),
//   "shutdownSchedules.json"
// );
const shutdownSchedulesPath = async () => {
  const fileLocation: string = await ipcRenderer.invoke("getSaveLocation");
  console.log(fileLocation);

  return fileLocation;
};

const taskNamePrefix = "ElectronShutdownTask";
const isWindows = os.platform() === "win32";
const isMacOS = os.platform() === "darwin";
const isLinux = os.platform() === "linux";
const isUnix = !isMacOS && !isLinux && !isWindows;

// Helper function to load schedules from a JSON file
const loadSchedules = async () => {
  const path = await shutdownSchedulesPath();
  if (fs.existsSync(path)) {
    const data = fs.readFileSync(path, "utf-8");
    return JSON.parse(data) as ShutdownSchedule[];
  }
  return [];
};

// Helper function to save schedules to a JSON file
const saveSchedules = async (schedules: ShutdownSchedule[]) => {
  const path = await shutdownSchedulesPath();
  fs.writeFileSync(path, JSON.stringify(schedules, null, 2));
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

const enableCronTask = async (taskName: string) => {
  try {
    const stdout = await execAsync(`crontab -l`);
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

    try {
      await execAsync(`echo "${updatedCron}" | crontab -`);
      console.log(`Cron job ${taskName} enabled.`);
    } catch (error) {
      console.error(
        `Error enabling cron job for ${taskName}: ${error.message}`
      );
    }
  } catch (error) {
    console.error(`Error reading crontab: ${error.message}`);
    return;
  }
};

const disableCronTask = async (taskName: string) => {
  try {
    const stdout = await execAsync(`crontab -l`);
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

    try {
      await execAsync(`echo "${updatedCron}" | crontab -`);
      console.log(`Cron job ${taskName} disabled.`);
    } catch (error) {
      console.error(
        `Error disabling cron job for ${taskName}: ${error.message}`
      );
    }
  } catch (error) {
    console.error(`Error reading crontab: ${error.message}`);
    return;
  }
};

const deleteAtTask = async (jobId: string) => {
  try {
    await execAsync(`atrm ${jobId}`);
    console.log(`At job with ID ${jobId} deleted.`);
  } catch (error) {
    console.error(`Error deleting at job with ID ${jobId}: ${error.message}`);
  }
};

// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ------------------------------------------------------------------

const listShutdownSchedules = async () => {
  console.log(await loadSchedules());

  return (await loadSchedules()).map((schedule) => ({
    ...schedule,
    scheduledTime: new Date(schedule.timestamp).toLocaleString(),
  }));
};

const createTask = async ({
  delayInSeconds = 0,
  delayInMinutes = 0,
  delayInHours = 0,
  delayInDays = 0,
  action = "shutdown",
  scheduleType = "once",
  daysOfWeek = [],
  enabled = true,
  onSuccess,
}: {
  delayInSeconds?: number;
  delayInMinutes: number;
  delayInHours: number;
  delayInDays: number;
  action: "shutdown" | "reboot";
  scheduleType: "once" | "daily" | "weekly";
  daysOfWeek?: string[];
  enabled?: boolean;
  onSuccess?: () => void;
}) => {
  const delayInMilliseconds =
    (delayInSeconds > 0 && delayInSeconds <= 60 ? 61 : delayInSeconds) * 1000 +
    (delayInMinutes === 1 ? delayInMinutes + 1 : delayInMinutes) * 60 * 1000 +
    delayInHours * 60 * 60 * 1000 +
    delayInDays * 24 * 60 * 60 * 1000;

  // Calculate the future timestamp based on the total delay
  const timestamp = Date.now() + delayInMilliseconds;
  const taskName = `${taskNamePrefix}_${timestamp}`;
  const scheduledTime = new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
  });

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

    try {
      await execAsync(schtasksCommand);
      console.log(`${action} timer set for ${scheduledTime}`);
      const schedules = await loadSchedules();
      schedules.push({
        action,
        taskName,
        timestamp,
        delayInSeconds,
        scheduledTime,
        enabled,
        scheduleType,
        daysOfWeek,
      });
      await saveSchedules(schedules);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(`Error setting ${action} timer: ${error.message}`);
    }
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
      // const atTime = new Date(timestamp).toLocaleTimeString("en-GB", {
      //   hour: "2-digit",
      //   minute: "2-digit",
      //   hour12: true,
      // });

      const date = new Date(timestamp);

      // Format the date as MM/DD/YYYY
      const formattedDate = `${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;

      // Format the time as HH:MM
      const formattedTime = `${String(date.getHours()).padStart(
        2,
        "0"
      )}:${String(date.getMinutes()).padStart(2, "0")}`;

      const atTime = `${formattedTime} ${formattedDate}`;

      console.log(`echo "${command}" | at ${atTime}`);

      try {
        const stdout = await execAsync(
          `echo "${command}" | at ${atTime} 2>&1 | head -n 1 | grep -oE '[0-9]+'`
        );
        const jobId = stdout.split("\n")[0].trim(); // Extracts job ID (numeric part)

        console.log(`Job scheduled with ID: ${jobId}`);
        console.log(`${action} set for once at ${atTime}`);

        const schedules = await loadSchedules();
        schedules.push({
          action,
          taskName,
          timestamp,
          delayInSeconds,
          scheduledTime,
          enabled,
          scheduleType,
          daysOfWeek,
          jobId,
        });
        await saveSchedules(schedules);

        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        console.error(
          `Error setting one-time ${action} with 'at' command: ${error.message}`
        );
      }
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

      try {
        await execAsync(`(crontab -l; echo "${cronEntry}") | crontab -`);
        console.log(`${scheduleType} cron job set for ${scheduledTime}`);

        const schedules = await loadSchedules();
        schedules.push({
          action,
          taskName,
          timestamp,
          delayInSeconds,
          scheduledTime,
          enabled,
          scheduleType,
          daysOfWeek,
        });
        await saveSchedules(schedules);

        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        console.error(
          `Error setting ${scheduleType} ${action} cron job: ${error.message}`
        );
      }
    }
  }
};

const deleteTask = async ({
  taskName,
  jobId,
}: {
  taskName: string;
  jobId?: string;
}) => {
  const schedules = await loadSchedules();
  const taskIndex = schedules.findIndex(
    (schedule) => schedule.taskName === taskName
  );

  if (taskIndex !== -1) {
    if (isWindows) {
      try {
        await execAsync(`schtasks /delete /tn ${taskName} /f`);
        schedules.splice(taskIndex, 1);
        await saveSchedules(schedules);
        console.log(`Shutdown canceled successfully for task ${taskName}`);
      } catch (error) {
        console.error(
          `Error canceling shutdown for task ${taskName}: ${error.message}`
        );
      }
    } else {
      if (jobId) {
        await deleteAtTask(jobId);
        schedules.splice(taskIndex, 1);
        await saveSchedules(schedules);
      } else {
        try {
          await execAsync(
            `crontab -l | sed '/# ${taskName}/,/^$/d' | crontab -`
          );
          schedules.splice(taskIndex, 1);
          await saveSchedules(schedules);
          console.log(`Cron job canceled for ${taskName}`);
        } catch (error) {
          console.error(
            `Error removing cron job for ${taskName}: ${error.message}`
          );
        }
      }
    }
  } else {
    console.log(`No task found with name ${taskName}`);
  }
};

const deleteAllTasks = async () => {
  const schedules = await loadSchedules();
  if (isWindows) {
    for (const { taskName } of schedules) {
      try {
        await execAsync(`schtasks /delete /tn ${taskName} /f`);
        console.log(`Shutdown canceled for ${taskName}`);
      } catch (error) {
        console.error(
          `Error canceling shutdown for task ${taskName}: ${error.message}`
        );
      }
    }
  } else {
    {
      // delete all at tasks
      const schedules = await loadSchedules();
      for (const { jobId } of schedules) {
        if (jobId) {
          await deleteAtTask(jobId);
        }
      }
    }

    try {
      // delete all cron jobs
      const stdout = await execAsync(`crontab -l`);
      let skipNext = false;
      const updatedCron = stdout
        .split("\n")
        .filter((line) => {
          if (skipNext) {
            skipNext = false; // Skip this line and reset the flag
            return false;
          }
          if (line.startsWith(`# ${taskNamePrefix}_`)) {
            skipNext = true; // Set flag to skip the following line
            return false;
          }
          return true; // Keep lines that don’t match the condition
        })
        .join("\n");

      try {
        await execAsync(`echo "${updatedCron}" | crontab -`);
        console.log("All shutdown-related cron jobs canceled.");
      } catch (error) {
        console.error(
          `Error updating crontab to remove shutdown tasks: ${error.message}`
        );
      }
    } catch (error) {
      console.error(`Error listing cron jobs: ${error.message}`);
      return;
    }
  }
  await saveSchedules([]);
};

const enableTask = async ({ taskName }: { taskName: string }) => {
  const schedules = await loadSchedules();
  const schedule = schedules.find((s) => s.taskName === taskName);

  if (!schedule) {
    console.log(`Task ${taskName} not found.`);
    return;
  }

  if (isWindows) {
    try {
      await execAsync(`schtasks /change /tn ${taskName} /enable`);
      schedule.enabled = true;
      await saveSchedules(schedules);
      console.log(`Task ${taskName} enabled successfully.`);
    } catch (error) {
      console.error(`Error enabling task ${taskName}: ${error.message}`);
      return;
    }
  } else {
    enableCronTask(taskName);
    schedule.enabled = true;
    await saveSchedules(schedules);
  }
};

const disableTask = async ({ taskName }: { taskName: string }) => {
  const schedules = await loadSchedules();
  const schedule = schedules.find((s) => s.taskName === taskName);

  if (!schedule) {
    console.log(`Task ${taskName} not found.`);
    return;
  }

  if (isWindows) {
    try {
      await execAsync(`schtasks /change /tn ${taskName} /disable`);
      schedule.enabled = false;
      await saveSchedules(schedules);
      console.log(`Task ${taskName} disabled successfully.`);
    } catch (error) {
      console.error(`Error disabling task ${taskName}: ${error.message}`);
      return;
    }
  } else {
    disableCronTask(taskName);

    schedule.enabled = false;
    await saveSchedules(schedules);
  }
};

const enableAllTasks = async () => {
  const schedules = await loadSchedules();
  for (const schedule of schedules) {
    if (isWindows) {
      try {
        execAsync(`schtasks /change /tn ${schedule.taskName} /enable`);
      } catch (error) {
        console.error(
          `Error enabling task ${schedule.taskName}: ${error.message}`
        );
      }
    } else {
      enableCronTask(schedule.taskName);
    }
    schedule.enabled = true;
  }
  await saveSchedules(schedules);
  console.log("All tasks enabled successfully.");
};

const disableAllTasks = async () => {
  const schedules = await loadSchedules();
  for (const schedule of schedules) {
    if (isWindows) {
      try {
        await execAsync(`schtasks /change /tn ${schedule.taskName} /disable`);
      } catch (error) {
        console.error(
          `Error disabling task ${schedule.taskName}: ${error.message}`
        );
      }
    } else {
      disableCronTask(schedule.taskName);
    }
    schedule.enabled = false;
  }
  await saveSchedules(schedules);
  console.log("All tasks disabled successfully.");
};

// Shutdown scheduling and management API
export const bridgeApi = {
  listShutdownSchedules,

  createTask,

  deleteTask,

  deleteAllTasks,

  enableTask,

  disableTask,

  enableAllTasks,

  disableAllTasks,

  isDev: () => ipcRenderer.invoke("isDev", ["hey"]),

  // createTask: (args) => ipcRenderer.invoke("createTask", args),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("bridge", bridgeApi);
