/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { ISource } from '../../sources/source';
import { IBPRecipe } from '../bpRecipe';
import { CDTPBPRecipe } from '../../../cdtpDebuggee/cdtpPrimitives';
import { ValidatedMultiMap } from '../../../collections/validatedMultiMap';
import { IBreakpointsEventsListener } from '../features/breakpointsEventSystem';

type ClientBPRecipe = IBPRecipe<ISource>;
type DebuggeeBPRecipe = CDTPBPRecipe;

/**
 * Find all the debuggee breakpoint recipes we set for a particular client breakpoint recipe
 */
export class DebuggeeBPRsSetForClientBPRFinder {
    private readonly _clientBPRToDebuggeeBPRItSet = new ValidatedMultiMap<ClientBPRecipe, DebuggeeBPRecipe>();

    public constructor(breakpointsEventsListener: IBreakpointsEventsListener) {
        breakpointsEventsListener.listenForOnClientBPRecipeAdded(clientBPRecipe => this.clientBPRWasAdded(clientBPRecipe));
        breakpointsEventsListener.listenForOnDebuggeeBPRecipeAdded(debuggeeBPRecipe => this.debuggeeBPRsWasAdded(debuggeeBPRecipe));
        breakpointsEventsListener.listenForOnDebuggeeBPRecipeRemoved(debuggeeBPRecipe => this.debuggeeBPRsWasRemoved(debuggeeBPRecipe));
        breakpointsEventsListener.listenForOnClientBPRecipeRemoved(clientBPRecipe => this.clientBPRWasRemoved(clientBPRecipe));
    }

    public findDebuggeeBPRsSet(clientBPRecipe: ClientBPRecipe): DebuggeeBPRecipe[] {
        // TODO: Review if it's okay to use getOr here, or if we should use get instead
        return Array.from(this._clientBPRToDebuggeeBPRItSet.getOr(clientBPRecipe, () => new Set()));
    }

    private clientBPRWasAdded(clientBPRecipe: ClientBPRecipe): void {
        this._clientBPRToDebuggeeBPRItSet.addKeyIfNotExistant(clientBPRecipe);
    }

    private debuggeeBPRsWasAdded(debuggeeBPRecipe: DebuggeeBPRecipe): void {
        /**
         * If we load the same script two times, we'll try to register the same client BP
         * with the same debuggee BP twice, so we need to allow duplicates
         */
        this._clientBPRToDebuggeeBPRItSet.addAndIgnoreDuplicates(debuggeeBPRecipe.unmappedBPRecipe, debuggeeBPRecipe);
    }

    private debuggeeBPRsWasRemoved(debuggeeBPRecipe: DebuggeeBPRecipe): void {
        this._clientBPRToDebuggeeBPRItSet.removeValue(debuggeeBPRecipe.unmappedBPRecipe, debuggeeBPRecipe);
    }

    private clientBPRWasRemoved(clientBPRecipe: ClientBPRecipe): void {
        const debuggeBPRecipies = this._clientBPRToDebuggeeBPRItSet.get(clientBPRecipe);
        if (debuggeBPRecipies.size >= 1) {
            throw new Error(`Tried to remove a Client breakpoint recipe (${clientBPRecipe}) which still had some `
                + `associated debuggee breakpoint recipes (${debuggeBPRecipies})`);
        }

        this._clientBPRToDebuggeeBPRItSet.delete(clientBPRecipe);
    }

    public toString(): string {
        return `Debuggee BPRs set for Client BPR finder: ${this._clientBPRToDebuggeeBPRItSet}`;
    }
}
