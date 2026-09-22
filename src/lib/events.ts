import "server-only";
import { EventEmitter } from "node:events";

export type ProjectEventType =
  | "task:created"
  | "task:updated"
  | "task:deleted"
  | "member:joined"
  | "member:removed";

export interface ProjectEvent<T = unknown> {
  readonly type: ProjectEventType;
  readonly projectId: string;
  readonly actorId?: string;
  readonly payload: T;
  readonly timestamp: string;
}

type ProjectEventListener = (event: ProjectEvent) => void;

class ProjectEventEmitter {
  private readonly emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  public emit<T>(
    projectId: string,
    type: ProjectEventType,
    payload: T,
    actorId?: string
  ): boolean {
    const event: ProjectEvent<T> = {
      type,
      projectId,
      actorId,
      payload,
      timestamp: new Date().toISOString(),
    };
    return this.emitter.emit(`project:${projectId}`, event);
  }

  public subscribe(projectId: string, listener: ProjectEventListener): void {
    this.emitter.on(`project:${projectId}`, listener);
  }

  public unsubscribe(projectId: string, listener: ProjectEventListener): void {
    this.emitter.off(`project:${projectId}`, listener);
  }
}

const globalForEvents = globalThis as unknown as {
  projectEventEmitter?: ProjectEventEmitter;
};

export const projectEvents =
  globalForEvents.projectEventEmitter ?? new ProjectEventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.projectEventEmitter = projectEvents;
}
