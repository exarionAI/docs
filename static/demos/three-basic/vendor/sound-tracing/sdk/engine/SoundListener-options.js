import { EXA_DIFFUSE_BUDGET_HIGH, EXA_DIFFUSE_BUDGET_LOW, EXA_DIFFUSE_BUDGET_MED, EXA_HRTF_BUDGET_HIGH, EXA_HRTF_BUDGET_LOW, EXA_HRTF_BUDGET_MED, EXA_HRTF_MODE_BAND8, EXA_HRTF_MODE_HRIR, EXA_HRTF_MODE_HRIR_INTERPOLATED, EXA_HRTF_MODE_PARAMETRIC, EXA_OUTPUT_MODE_HRTF, EXA_OUTPUT_MODE_SPEAKER, } from '../native/structs.js';
/** HRTF spatializer modes — the v0.7 vendor-neutral EXA_HRTF_MODE_* values.
 *  Band8 (the 8-band magnitude + ITD spatializer) is the table-free default;
 *  Parametric needs a BPH1 table; Hrir / HrirInterpolated share one MPI1
 *  min-phase table (a legacy SAH1 table satisfies HrirInterpolated only) and
 *  differ only in direction lookup (nearest vs spectral bilinear). */
export const HrtfMode = {
    Band8: EXA_HRTF_MODE_BAND8,
    Parametric: EXA_HRTF_MODE_PARAMETRIC,
    Hrir: EXA_HRTF_MODE_HRIR,
    HrirInterpolated: EXA_HRTF_MODE_HRIR_INTERPOLATED,
};
export const HrtfModeName = {
    Band8: 'band8',
    Parametric: 'parametric',
    Hrir: 'hrir',
    HrirInterpolated: 'hrirInterpolated',
};
/** Documented HRTF path-budget operating points (raw top-K full-voice paths;
 *  larger = higher quality). v0.7 replaced the LOW/MED/HIGH quality enum with
 *  these raw budgets — any uint32 is accepted by the core. */
export const HrtfPathBudget = {
    Low: EXA_HRTF_BUDGET_LOW,
    Medium: EXA_HRTF_BUDGET_MED,
    High: EXA_HRTF_BUDGET_HIGH,
};
/** Documented diffuse path-budget operating points (raw top-K scattered-energy
 *  paths; larger = higher quality). */
export const DiffusePathBudget = {
    Low: EXA_DIFFUSE_BUDGET_LOW,
    Medium: EXA_DIFFUSE_BUDGET_MED,
    High: EXA_DIFFUSE_BUDGET_HIGH,
};
export const DelayInterpolation = {
    Linear: 0,
    CubicLagrange: 1,
    Lagrange6: 2,
};
/** Table-backed modes the facade can select after a successful loadHrtf()
 *  (Band8 needs no table and is excluded on purpose — it is the default). */
export function isSupportedHrtfMode(value) {
    return value === HrtfMode.Parametric
        || value === HrtfMode.Hrir
        || value === HrtfMode.HrirInterpolated;
}
export function isDelayInterpolation(value) {
    return value === DelayInterpolation.Linear
        || value === DelayInterpolation.CubicLagrange
        || value === DelayInterpolation.Lagrange6;
}
/** Listener output modes — the v0.7 EXA_OUTPUT_MODE_* values (core 7efb8b87).
 *  Hrtf (default) keeps the binaural/HRTF renderer; Speaker selects the
 *  internal Ambisonic speaker renderer (1ch center / 2ch stereo scope). HRTF
 *  modes and loaded HRTF assets apply to Hrtf output only. */
export const OutputMode = {
    Hrtf: EXA_OUTPUT_MODE_HRTF,
    Speaker: EXA_OUTPUT_MODE_SPEAKER,
};
export function isOutputMode(value) {
    return value === OutputMode.Hrtf || value === OutputMode.Speaker;
}
//# sourceMappingURL=SoundListener-options.js.map