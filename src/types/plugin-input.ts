import { StaticDecode, Type as T } from "@sinclair/typebox";
import { StandardValidator } from "typebox-validators";
import { SupportedEvents, SupportedEventsU } from "./context";

export interface PluginInputs<T extends SupportedEventsU = SupportedEventsU, TU extends SupportedEvents[T] = SupportedEvents[T]> {
  stateId: string;
  eventName: T;
  eventPayload: TU["payload"];
  settings: StartStopSettings;
  authToken: string;
  ref: string;
}

const rolesWithReviewAuthority = T.Array(T.String(), { default: ["COLLABORATOR", "OWNER", "MEMBER", "ADMIN"] });

function maxConcurrentTasks() {
  return T.Transform(T.Record(T.String(), T.Integer(), { default: { member: 10, contributor: 2 } }))
    .Decode((obj) => {
      // normalize the role keys to lowercase
      obj = Object.keys(obj).reduce(
        (acc, key) => {
          acc[key.toLowerCase()] = obj[key];
          return acc;
        },
        {} as Record<string, number>
      );

      // If admin is omitted, defaults to infinity
      if (!obj["admin"]) {
        obj["admin"] = Infinity;
      }

      return obj;
    })
    .Encode((value) => value);
}

export const startStopSchema = T.Object(
  {
    reviewDelayTolerance: T.String({ default: "1 Day" }),
    taskStaleTimeoutDuration: T.String({ default: "30 Days" }),
    startRequiresWallet: T.Boolean({ default: true }),
    maxConcurrentTasks: maxConcurrentTasks(),
    emptyWalletText: T.String({ default: "Please set your wallet address with the /wallet command first and try again." }),
    rolesWithReviewAuthority: T.Transform(rolesWithReviewAuthority)
      .Decode((value) => value.map((role) => role.toUpperCase()))
      .Encode((value) => value.map((role) => role.toUpperCase())),
    requiredLabelsToStart: T.Array(T.String()), // no default, must be in the config
  },
  {
    default: {},
  }
);

export type StartStopSettings = StaticDecode<typeof startStopSchema>;
export const startStopSettingsValidator = new StandardValidator(startStopSchema);
