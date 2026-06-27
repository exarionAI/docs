import type { Bindings, Heap } from './native/index.js';
import type { CommandStartAudioSource, CommandStopAudioSource } from './control-protocol.js';
export declare class ControlWorkerAudioRenderer {
    private readonly bindings;
    private readonly heap;
    private readonly getListenerId;
    private readonly sessions;
    private timer;
    constructor(bindings: Bindings, heap: Heap, getListenerId: () => number);
    startSourceSession(command: CommandStartAudioSource & {
        readonly engineId: number;
    }): {
        readonly sessionId: number;
        readonly started: true;
    };
    stopSourceSession(sessionId: CommandStopAudioSource['sessionId']): {
        readonly sessionId: number;
        readonly stopped: boolean;
    };
    dispose(): void;
    private ensurePumpStarted;
    private stopPump;
    private pump;
    private pumpSession;
}
//# sourceMappingURL=control-worker-audio.d.ts.map