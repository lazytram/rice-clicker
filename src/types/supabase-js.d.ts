declare module "@supabase/supabase-js" {
  export interface RealtimeBroadcastEnvelope<TPayload> {
    type: "broadcast";
    event: string;
    payload: TPayload;
  }

  export interface RealtimeChannel {
    on<TPayload>(
      type: "broadcast",
      filter: { event: string },
      callback: (msg: RealtimeBroadcastEnvelope<TPayload>) => void
    ): RealtimeChannel;
    subscribe(callback?: () => void): void;
    send<TPayload>(msg: RealtimeBroadcastEnvelope<TPayload>): void;
  }

  export interface SupabaseClientLike {
    channel(name: string, opts?: unknown): RealtimeChannel;
    removeChannel(channel: RealtimeChannel): void;
  }

  export function createClient(
    url: string,
    key: string,
    options?: unknown
  ): SupabaseClientLike;
}
