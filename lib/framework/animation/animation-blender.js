import vec2 from "../../vmath/vec2";
import vec3 from "../../vmath/vec3";
import {clamp} from "../../vmath/utils";

export class DefaultPair {
    set(first, second) {
        this.first = first;
        this.second = second;
    }
}
export class Pair {
    constructor(first, second) {
        this.first = first;
        this.second = second;
    }
    set(first, second) {
        this.first = first;
        this.second = second;
    }
}
export class Blender1DResult {
    constructor() {
        this.weights = [
            new DefaultPair(), new DefaultPair()
        ];
        this.weightsNumber = 0;
    }
}
export class Blender1D {
    constructor() {
        this._samples = []; // sorted whenever
    }
    get samplesLength() {
        return this._samples.length;
    }
    setSamples(samples_) {
        this._samples = new Array(samples_.length);
        for (let i = 0; i < samples_.length; ++i)
            this._samples[i] = new Pair(i, samples_[i]);
        this._samples.sort((x, y) => x.second - y.second);
    }
    get(result, value_) {
        if (this._samples.length == 0)
            result.weightsNumber = 0;
        else if (value_ <= this._samples[0].second) {
            result.weightsNumber = 1;
            result.weights[0].set(this._samples[0].first, 1);
        }
        else if (value_ >= this._samples[this._samples.length - 1].second) {
            result.weightsNumber = 1;
            result.weights[0].set(this._samples[this._samples.length - 1].first, 1);
        }
        else {
            let iGreater = 0;
            for (let i = 1; i < this._samples.length; ++i)
                if (this._samples[i].second > value_) {
                    iGreater = i;
                    break;
                }
            let lower = this._samples[iGreater - 1].second;
            let upper = this._samples[iGreater].second;
            let x = upper - lower;
            result.weightsNumber = 2;
            result.weights[0].set(this._samples[iGreater - 1].first, (upper - value_) / x);
            result.weights[1].set(this._samples[iGreater].first, (value_ - lower) / x);
        }
    }
}
export class Blender2D {
    constructor() {
        this._samples = [];
    }
    get samplesLength() {
        return this._samples.length;
    }
    setSamples(samples_) {
        this._samples = samples_;
    }
    /**
     * @param {vec2} pQueried - Input argument(Queried velocity).
     * */
    get2DSimpleDirectional(result, pQueried) {
        let cloestSamples = this._sdGetClosestAngleSamples(pQueried);
        let nodeInfluences = this._sdCalcInfluence(pQueried, this._samples[cloestSamples.first], this._samples[cloestSamples.second]);
        for (let i = 0; i < result.length; ++i)
            result[i] = 0;
        // Node influence part
        let nodeInfluencePartUnclamped = nodeInfluences.t1 + nodeInfluences.t2;
        let nodeInfluencePart = clamp(nodeInfluencePartUnclamped, 0, 1);
        result[cloestSamples.first] = nodeInfluences.t1 / nodeInfluencePartUnclamped * nodeInfluencePart;
        result[cloestSamples.second] = nodeInfluences.t2 / nodeInfluencePartUnclamped * nodeInfluencePart;
        // Center influence part
        if (nodeInfluencePart < 1) {
            let centerInfluencePart = 1 - nodeInfluencePart;
            if (cloestSamples.center >= 0)
                result[cloestSamples.center] = centerInfluencePart;
            else {
                let average = centerInfluencePart / result.length;
                for (let i = 0; i < result.length; ++i)
                    result[i] += average;
            }
        }
        return result;
    }
    _sdRepeat(t, length) {
        return clamp(t - Math.floor(t / length) * length, 0, length);
    }
    _sdGetClosestAngleSamples(pQueried) {
        // atan2 返回的角度是[-180, 180]，四个象限的角度范围（逆时针）分别是[0,90]、[90,180]、[-180,-90]、[-90,0]
        let angleQueriedPoint = Math.atan2(pQueried.y, pQueried.x);
        let dangles = [];
        let center = -1;
        for (let i = 0; i < this._samples.length; ++i) {
            let samplePoint = this._samples[i];
            if (vec2.equals(samplePoint, vec2.zero())) {
                center = i;
                continue;
            }
            let angle = Math.atan2(samplePoint.y, samplePoint.x);
            let dangle = this._sdRepeat(angle - angleQueriedPoint, 2 * Math.PI);
            dangles.push({ index: i, dangle: dangle });
        }
        dangles.sort((a, b) => a.dangle - b.dangle);
        return { first: dangles[0].index, second: dangles[dangles.length - 1].index, center: center };
    }
    _sdCalcInfluence(pQueried, firstSample, secondSample) {
        // Satisfy:
        //	pQueried = firstSample * t1 + secondSample * t2
        //  Because the variables are all vec2, so it can be solved.
        // |  firstSample.x   secondSample.x |         |t1|       |pQueried.x|
        // |                                 |    x    |  |   =   ||
        // |  firstSample.y   secondSample.y |         |t2|       |pQueried.y|
        let x1 = firstSample.x, y1 = firstSample.y, x2 = secondSample.x, y2 = secondSample.y;
        // Calculate the determinant
        let det = x1 * y2 - x2 * y1;
        if (!det)
            return { t1: 0, t2: 0 };
        det = 1.0 / det;
        // The inverse matrix
        let inv00 = y2 * det;
        let inv10 = -y1 * det;
        let inv01 = -x2 * det;
        let inv11 = x1 * det;
        let t1 = inv00 * pQueried.x + inv01 * pQueried.y;
        let t2 = inv10 * pQueried.x + inv11 * pQueried.y;
        if (t1 < 0 || t2 < 0)
            t1 = t2 = 0.5;
        return { t1: t1, t2: t2 };
    }
    /**
     * @param {vec2} pQueried - Input argument(Queried velocity).
     * */
    get2DFreeformCartesian(result, pQueried) {
        return this._genFreeform(result, (pi, pj, pip, pipj) => {
            vec2.sub(pip, pQueried, pi);
            vec2.sub(pipj, pj, pi);
        });
    }
    /**
     * @param {vec2} pQueried - Input argument(Queried velocity).
     * */
    get2DFreeformDirectional(result, pQueried) {
        let axis = vec3.zero(); // buffer for axis
        let tmpV3 = vec3.zero(); // buffer for temp vec3
        let pQueriedProjected = vec3.zero(); // buffer for pQueriedProjected
        let pi3 = vec3.zero(); // buffer for pi3
        let pj3 = vec3.zero(); // buffer for pj3
        let pQueried3 = vec3.zero(); // buffer for pQueried3
        return this._genFreeform(result, (pi, pj, pip, pipj) => {
            let aIJ = 0.0;
            let aIQ = 0.0;
            let angleMultiplier = 2.0;
            vec3.set(pQueriedProjected, pQueried.x, pQueried.y, 0.0);
            if (vec2.equals(pi, vec2.zero())) {
                aIJ = vec2.angle(pQueried, pj);
                aIQ = 0.0;
                angleMultiplier = 1.0;
            }
            else if (vec2.equals(pj, vec2.zero())) {
                aIJ = vec2.angle(pQueried, pi);
                aIQ = aIJ;
                angleMultiplier = 1.0;
            }
            else {
                aIJ = vec2.angle(pi, pj);
                if (aIJ <= 0.0)
                    aIQ = 0.0;
                else if (vec2.equals(pQueried, vec2.zero()))
                    aIQ = aIJ;
                else {
                    vec3.set(pi3, pi.x, pi.y, 0);
                    vec3.set(pj3, pj.x, pj.y, 0);
                    vec3.set(pQueried3, pQueried.x, pQueried.y, 0);
                    vec3.cross(axis, pi3, pj3);
                    vec3.projectOnPlane(pQueriedProjected, pQueried3, axis);
                    aIQ = vec3.angle(pi3, pQueriedProjected);
                    if (aIJ < Math.PI * 0.99)
                        if (vec3.dot(vec3.cross(tmpV3, pi3, pQueriedProjected), axis) < 0)
                            aIQ = -aIQ;
                }
            }
            let lenpi = vec2.magnitude(pi);
            let lenpj = vec2.magnitude(pj);
            let deno = (lenpj + lenpi) / 2;
            vec2.set(pipj, (lenpj - lenpi) / deno, aIJ * angleMultiplier);
            vec2.set(pip, (vec3.magnitude(pQueriedProjected) - lenpi) / deno, aIQ * angleMultiplier);
        });
    }
    _genFreeform(result, influenceFunc) {
        let hiList = [];
        let hiSum = 0;
        let pip = vec2.zero();
        let pipj = vec2.zero();
        this._samples.forEach((pi, ii) => {
            let hi = Number.MAX_VALUE;
            this._samples.forEach((pj, ij) => {
                if (ij == ii)
                    return;
                influenceFunc(pi, pj, pip, pipj);
                let t = 1 - vec2.dot(pip, pipj) / vec2.squaredMagnitude(pipj);
                if (t < 0) {
                    hi = 0;
                    return;
                }
                //t = clamp(t, 0, 1);
                if (t < hi)
                    hi = t;
            });
            hiList.push(hi);
            hiSum += hi;
        });
        hiList.forEach((hi, index) => result[index] = hi / hiSum);
        return result;
    }
}
//# sourceMappingURL=blender.js.map