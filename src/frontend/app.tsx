import {
  DayOfWeek,
  getFullDayName,
  githubRepository,
  githubRepositoryLatestRelease,
  scheduleFileName,
  taskNamePrefix,
} from "@/common";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast, useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SerializedScheduledTask } from "@/preload";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BugIcon,
  CopyIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  GithubIcon,
  InfoIcon,
  LoaderIcon,
  PlusIcon,
  TerminalIcon,
  Trash2Icon,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { queryClient } from ".";

// check psshutdown for sleep mode `psshutdown -d -t 0` https://superuser.com/a/395497
// type ArgumentTypes = Parameters<typeof window.bridge.createTask>;

window.bridge.onUpdateAvailable(() => {
  const NOTIFICATION_TITLE = "Downloading Update";
  const NOTIFICATION_BODY = "A new version of the app is available.";
  const CLICK_MESSAGE = "Notification clicked!";

  toast({
    title: NOTIFICATION_TITLE,
    description: NOTIFICATION_BODY,
    // "A new version of the app is available. Please download and install the new version.",
  });

  new window.Notification(NOTIFICATION_TITLE, {
    body: NOTIFICATION_BODY,
  }).onclick = () => {
    // document.getElementById("output").innerText = CLICK_MESSAGE;
  };
});

export function App() {
  const { toast } = useToast();
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  const getAppVersionQuery = useQuery({
    queryKey: ["getAppVersion"],
    queryFn: window.bridge.getAppVersion,
  });
  const getTasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: window.bridge.getTasks,
  });
  const getOsQuery = useQuery({
    queryKey: ["os"],
    queryFn: window.bridge.getOs,
  });
  const getUserDataLocationQuery = useQuery({
    queryKey: ["userDataLocation"],
    queryFn: window.bridge.getUserDataLocation,
  });
  const getTaskDatabaseFilePathQuery = useQuery({
    queryKey: ["getTaskDatabaseFilePath"],
    queryFn: window.bridge.getTaskDatabaseFilePath,
  });
  const openTaskSchedulerMutation = useMutation({
    mutationKey: ["openTaskScheduler"],
    mutationFn: window.bridge.openTaskScheduler,
  });

  const deleteAllTasksMutation = useMutation({
    mutationKey: ["deleteAllTasks"],
    mutationFn: window.bridge.deleteAllTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Tasks Deleted",
        description: "All tasks have been deleted successfully.",
      });
    },
  });
  const createTaskMutation = useMutation({
    mutationKey: ["createTask"],
    mutationFn: window.bridge.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task Created",
        description: "Task has been scheduled successfully.",
      });
    },
  });
  const disableAllTasksMutation = useMutation({
    mutationKey: ["disableAllTasks"],
    mutationFn: window.bridge.disableAllTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const [selectedAction, setSelectedAction] = useState<"shutdown" | "reboot">(
    "shutdown"
  );

  const [frequency, setFrequency] = useState<"once" | "daily" | "weekly">(
    "once"
  );

  const [days, setDays] = useState<
    {
      day: DayOfWeek;
      selected: boolean;
    }[]
  >([
    { day: "mon", selected: true },
    { day: "tue", selected: false },
    { day: "wed", selected: false },
    { day: "thu", selected: false },
    { day: "fri", selected: false },
    { day: "sat", selected: false },
    { day: "sun", selected: false },
  ]);

  const [delayInMinutes, setDelayInMinutes] = useState(5);
  const [delayInHours, setDelayInHours] = useState(0);
  const [delayInDays, setDelayInDays] = useState(0);

  const totalDelay = delayInMinutes + delayInHours * 60 + delayInDays * 24 * 60;

  const handleDaySelect = (day: DayOfWeek) => {
    if (selectedDays.length === 1 && selectedDays.includes(day)) {
      toast({
        title: "Error",
        description: "At least one day must be selected.",
      });

      return;
    }
    setDays((prev) =>
      prev.map((d) => (d.day === day ? { ...d, selected: !d.selected } : d))
    );
  };

  const selectedDays = days.filter((d) => d.selected).map((d) => d.day);

  const sortedTasks = getTasksQuery.data
    ? getTasksQuery.data.sort((a, b) => a.timestamp - b.timestamp)
    : [];

  useEffect(() => {
    const hasStartedBefore = localStorage.getItem("hasStartedBefore");
    if (!hasStartedBefore) {
      setIsFirstTime(true);
      setIsInfoDialogOpen(true);
      localStorage.setItem("hasStartedBefore", "true");
    }
  }, []);

  return (
    <>
      {/* use this for center */}
      {/* <div className="min-h-dvh flex items-center mx-auto  container xflex justify-center xitems-center h-full xpy-8 px-4 md:px-20"> */}
      <div className="mx-auto container xflex justify-center xitems-center h-full py-8 px-4 md:px-20">
        <div>
          <div className="flex items-center justify-between flex-wrap gap-1 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Schedule a task</h1>
            </div>
            <div className="flex items-center gap-2">
              {!!getAppVersionQuery.data && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="ghost">
                      <a
                        target="_blank"
                        href={`${githubRepositoryLatestRelease}`}
                      >
                        {getAppVersionQuery.data}
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Check for updates</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {false && <ModeToggle />}
              <Dialog
                onOpenChange={(isOpen) => {
                  setIsInfoDialogOpen(isOpen);
                }}
                open={isInfoDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <InfoIcon />
                  </Button>
                </DialogTrigger>
                <DialogContent
                  onOpenAutoFocus={(e) => {
                    e.preventDefault();
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>About</DialogTitle>
                    <DialogDescription>
                      Shutdown Scheduler is a simple cross-platform application
                      that uses system utilities for scheduling shutdown and
                      restart tasks.
                    </DialogDescription>
                  </DialogHeader>
                  <p className="text-sm">
                    For Unix-like systems, it uses{" "}
                    <a
                      target="_blank"
                      href="https://www.geeksforgeeks.org/crontab-in-linux-with-examples/"
                      className=" underline"
                    >
                      Cron
                    </a>{" "}
                    for recurring tasks and{" "}
                    <a
                      target="_blank"
                      href="https://www.geeksforgeeks.org/at-command-in-linux-with-examples/"
                      className=" underline"
                    >
                      at
                    </a>{" "}
                    for one-time tasks. <br /> For Windows, it uses the{" "}
                    <a
                      target="_blank"
                      href="https://learn.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page"
                      className=" underline"
                    >
                      Task Scheduler
                    </a>
                  </p>
                  {getUserDataLocationQuery.data &&
                    getTaskDatabaseFilePathQuery.data && (
                      <div>
                        <div className="flex flex-col gap-2">
                          <Label>
                            Database file `{scheduleFileName}` location:
                          </Label>
                          <div className="flex items-center gap-2">
                            <div className="grid flex-1 gap-2">
                              <Input
                                value={getTaskDatabaseFilePathQuery.data}
                                readOnly
                              />
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="px-3"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(
                                      getUserDataLocationQuery.data
                                    );
                                    toast({
                                      title: "Copied",
                                      description:
                                        "Folder path copied to clipboard.",
                                    });
                                  }}
                                >
                                  <span className="sr-only">Copy</span>
                                  <CopyIcon />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copy to Clipboard</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="px-3"
                                  onClick={async () => {
                                    await window.bridge.openFileExplorerInUserDataFolder();
                                  }}
                                >
                                  <FolderOpenIcon />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Open in File Explorer</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    )}
                  {getOsQuery.data === "win32" && (
                    <Button
                      disabled={!!queryClient.isMutating()}
                      onClick={async () => {
                        await openTaskSchedulerMutation.mutateAsync();
                      }}
                      variant="secondary"
                    >
                      {openTaskSchedulerMutation.isPending ? (
                        <LoaderIcon className="animate-spin" />
                      ) : (
                        <ExternalLinkIcon />
                      )}
                      Open Task Scheduler
                    </Button>
                  )}

                  {getOsQuery.data !== "win32" && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Use the following commands in your Terminal to see the
                        created tasks: <br />
                      </p>
                      <div className="flex flex-col gap-2 mt-4">
                        <Label>List one time tasks</Label>
                        <div className="flex items-center gap-2">
                          <div className="grid flex-1 gap-2">
                            <Input value="$ at -l" readOnly />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="submit"
                                size="sm"
                                className="px-3"
                                onClick={async () => {
                                  await navigator.clipboard.writeText("at -l");
                                  toast({
                                    title: "Copied",
                                    description:
                                      "Command 'at -l' copied to clipboard.",
                                  });
                                }}
                              >
                                <span className="sr-only">Copy</span>
                                <CopyIcon />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy to Clipboard</p>
                            </TooltipContent>
                          </Tooltip>
                          {getOsQuery.data === "darwin" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="px-3"
                                  onClick={async () => {
                                    await window.bridge.runCommandInTerminal(
                                      "at -l"
                                    );
                                  }}
                                >
                                  <TerminalIcon />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Run in Terminal</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 mt-4">
                        <Label>List recurring tasks</Label>
                        <div className="flex items-center gap-2">
                          <div className="grid flex-1 gap-2">
                            <Input value="$ crontab -l" readOnly />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="submit"
                                size="sm"
                                className="px-3"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(
                                    "crontab -l"
                                  );
                                  toast({
                                    title: "Copied",
                                    description:
                                      "Command 'crontab -l' copied to clipboard.",
                                  });
                                }}
                              >
                                <span className="sr-only">Copy</span>
                                <CopyIcon />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy to Clipboard</p>
                            </TooltipContent>
                          </Tooltip>
                          {getOsQuery.data === "darwin" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="px-3"
                                  onClick={async () => {
                                    await window.bridge.runCommandInTerminal(
                                      "crontab -l"
                                    );
                                  }}
                                >
                                  <TerminalIcon />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Run in Terminal</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="ghost" size="icon">
                    <a target="_blank" href={githubRepository}>
                      <GithubIcon />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Star me on GitHub</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="action">Action</Label>
                  <Select
                    onValueChange={(v) => {
                      const action = v as typeof selectedAction;
                      setSelectedAction(action);
                    }}
                    value={selectedAction}
                  >
                    <SelectTrigger className="xw-[180px]" id="action">
                      <SelectValue placeholder="Select an action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Action</SelectLabel>
                        <SelectItem value="shutdown">Shutdown</SelectItem>
                        <SelectItem value="reboot">Restart</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    onValueChange={(v) => {
                      const freq = v as typeof frequency;
                      setFrequency(freq);
                    }}
                    value={frequency}
                  >
                    <SelectTrigger className="xw-[180px]" id="frequency">
                      <SelectValue placeholder="Select a frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Frequency</SelectLabel>
                        <SelectItem value="once">Once</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {frequency === "weekly" && (
                <div>
                  <div className="text-xl font-bold mb-4">Days of the Week</div>
                  <div className="flex flex-wrap gap-4 backdrop-blur rounded items-center">
                    {/* <div className="bg-white/5 flex flex-wrap gap-4 p-4 backdrop-blur rounded"> */}
                    {days.map((day) => (
                      <div
                        key={day.day}
                        className="flex items-center space-x-2"
                      >
                        <Switch
                          id={day.day}
                          checked={day.selected}
                          onCheckedChange={() => handleDaySelect(day.day)}
                        />
                        <Label htmlFor={day.day}>
                          {getFullDayName(day.day)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xl font-bold mb-4">Delay</div>
                <div className="flex gap-4 items-center">
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="delay_minutes">Minutes</Label>
                    <Input
                      min={0}
                      type="number"
                      id="delay_minutes"
                      placeholder="Specify a delay in minutes"
                      value={delayInMinutes}
                      onChange={(e) =>
                        setDelayInMinutes(Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="delay_hours">Hours</Label>
                    <Input
                      min={0}
                      type="number"
                      id="delay_hours"
                      placeholder="Specify a delay in hours"
                      value={delayInHours}
                      onChange={(e) => setDelayInHours(Number(e.target.value))}
                    />
                  </div>
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="delay_days">Days</Label>
                    <Input
                      min={0}
                      type="number"
                      id="delay_days"
                      placeholder="Specify a delay in days"
                      value={delayInDays}
                      onChange={(e) => setDelayInDays(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="justify-end flex gap-2">
              <Button
                disabled={!!queryClient.isMutating() || !totalDelay}
                onClick={async () => {
                  await createTaskMutation.mutateAsync({
                    action: selectedAction,
                    scheduleType: frequency,
                    daysOfWeek: selectedDays,
                    delayInMinutes: delayInMinutes,
                    delayInHours: delayInHours,
                    delayInDays: delayInDays,
                  });
                }}
              >
                {createTaskMutation.isPending ? (
                  <LoaderIcon className="animate-spin" />
                ) : (
                  <PlusIcon />
                )}
                Create
              </Button>
            </div>
          </div>

          <Card className="mt-8 bg-gray-600/20 xborder-none">
            <CardHeader>
              <div
                className={cn("flex items-center justify-between flex-wrap")}
              >
                <div className={cn("flex flex-col space-y-1.5")}>
                  <CardTitle>Schedule</CardTitle>
                  <CardDescription>Manage your schedule here.</CardDescription>
                </div>
                <div className="justify-end flex gap-2 flex-wrap">
                  {getOsQuery.data === "win32" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={!!queryClient.isMutating()}
                          onClick={async () => {
                            await openTaskSchedulerMutation.mutateAsync();
                          }}
                          variant="ghost"
                        >
                          {openTaskSchedulerMutation.isPending ? (
                            <LoaderIcon className="animate-spin" />
                          ) : (
                            <ExternalLinkIcon />
                          )}
                          Open Task Scheduler
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tasks are prefixed by `{taskNamePrefix}`</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {getOsQuery.data !== "win32" && (
                    <Button
                      disabled={!!queryClient.isMutating()}
                      onClick={async () => {
                        setIsInfoDialogOpen(true);
                      }}
                      variant="ghost"
                    >
                      <BugIcon />
                      Debug
                    </Button>
                  )}
                  <Button
                    disabled={
                      !!queryClient.isMutating() || !getTasksQuery.data?.length
                    }
                    onClick={async () => {
                      await deleteAllTasksMutation.mutateAsync();
                    }}
                    variant="destructive"
                  >
                    {deleteAllTasksMutation.isPending ? (
                      <LoaderIcon className="animate-spin" />
                    ) : (
                      <Trash2Icon />
                    )}
                    Delete All
                  </Button>

                  {/* <Button
                    onClick={async () => {
                      await disableAllTasksMutation.mutateAsync();
                    }}
                    variant="secondary"
                  >
                    <BanIcon />
                    Disable All
                  </Button> */}
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {getTasksQuery.data?.length === 0 && (
                <div className="flex items-center justify-center">
                  <span className="text-muted-foreground">
                    No scheduled tasks found.
                  </span>
                </div>
              )}
              {sortedTasks.map((task) => (
                <React.Fragment key={task.taskName}>
                  <TaskRow task={task} />
                  <div className="border-b last:border-b-0 last:hidden"></div>
                </React.Fragment>
              ))}
            </CardContent>
            {/* <CardFooter>
              <Button variant="outline" className="w-full">
                Save preferences
              </Button>
            </CardFooter> */}
          </Card>
        </div>
      </div>
      {/* <div
        // style={{
        //   WebkitAppRegion: "drag",
        // }}
        className="fixed top-0 h-6 w-full app-region-drag"
      ></div> */}
    </>
  );
}

export function TaskRow({ task }: { task: SerializedScheduledTask }) {
  const { toast } = useToast();

  const deleteTaskMutation = useMutation({
    mutationKey: ["deleteTask"],
    mutationFn: window.bridge.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task Deleted",
        description: "Task has been deleted successfully.",
      });
    },
  });
  const enableTaskMutation = useMutation({
    mutationKey: ["enableTask"],
    mutationFn: window.bridge.enableTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task Enabled",
        description: "Task has been enabled successfully.",
      });
    },
  });
  const disableTaskMutation = useMutation({
    mutationKey: ["disableTask"],
    mutationFn: window.bridge.disableTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task Disabled",
        description: "Task has been disabled successfully.",
      });
    },
  });

  return (
    <div className="flex items-center justify-between gap-x-2">
      <div className="flex flex-col gap-2">
        <span>
          {
            {
              shutdown: "Shutdown",
              reboot: "Restart",
            }[task.action]
          }{" "}
          scheduled <Badge variant="outline">{task.scheduleType}</Badge> at{" "}
          {new Date(task.timestamp).toLocaleString(
            [],
            task.scheduleType === "once"
              ? {}
              : {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                }
          )}
        </span>
        <div className="flex items-center gap-2">
          {task.scheduleType === "weekly" && task.daysOfWeek.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {task.daysOfWeek.map((day) => (
                <Badge key={day} variant="default" className="capitalize">
                  {getFullDayName(day)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {false && (
          <Switch
            id={task.taskName}
            checked={task.enabled}
            onCheckedChange={async () => {
              if (!task.enabled) {
                await enableTaskMutation.mutateAsync({
                  taskName: task.taskName,
                });
              } else {
                await disableTaskMutation.mutateAsync({
                  taskName: task.taskName,
                });
              }
            }}
          />
        )}
        <Button
          disabled={!!queryClient.isMutating()}
          onClick={async () => {
            await deleteTaskMutation.mutateAsync({
              taskName: task.taskName,
              atJobId: task.atJobId,
            });
          }}
          size="icon"
          variant="ghost"
        >
          {deleteTaskMutation.isPending ? (
            <LoaderIcon className="animate-spin" />
          ) : (
            <Trash2Icon />
          )}
        </Button>
      </div>
    </div>
  );
}
