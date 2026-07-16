import { EXA_MAX_FREQUENCY_COUNT } from './structs.js';
/** Validate a directivity table's array shapes — the heap-OOB safety the core
 *  cannot do since exaSourceSetDirectivityTable trusts the caller-supplied
 *  nAngles. Returns nAngles. Throws RangeError on an out-of-range angle count
 *  (2..512) or an attenuation array whose length != nAngles * bands. The
 *  ascending-angle / finite-value checks stay in the core (surfaced as an
 *  error at the call site). */
export function assertDirectivityArrays(anglesDeg, attenDbPerBand) {
    const nAngles = anglesDeg.length;
    const expected = nAngles * EXA_MAX_FREQUENCY_COUNT;
    if (nAngles < 2 || nAngles > 512) {
        throw new RangeError(`[soundtrace.js] directivity nAngles must be 2..512, got ${nAngles}`);
    }
    if (attenDbPerBand.length !== expected) {
        throw new RangeError(`[soundtrace.js] directivity attenDbPerBand length must be ` +
            `nAngles*${EXA_MAX_FREQUENCY_COUNT} (${expected}), got ${attenDbPerBand.length}`);
    }
    return nAngles;
}
//# sourceMappingURL=directivity.js.map