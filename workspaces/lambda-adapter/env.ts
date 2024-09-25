export type Env = Record<string, string | undefined>;

declare const process:
  | {
      env: Env;
      exit: (exitCode?: number) => void;
      on: (event: string, listener: () => void) => void;
      versions?: {
        node: string;
      };
    }
  | undefined;

export function env(): Record<string, string | undefined>;
export function env(name: string): string | undefined;
export function env(
  name?: string
): string | undefined | Record<string, string | undefined> {
  if (typeof Deno !== "undefined") {
    return name ? Deno.env.get(name) : Deno.env.toObject();
  } else if (typeof process !== "undefined") {
    return name ? process.env[name] : process.env;
  }
}
