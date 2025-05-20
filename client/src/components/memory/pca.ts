export function computePCA(data: number[][], components = 2): number[][] {
    if (!data.length) return [];
    const dim = data[0].length;
    const mean = new Array(dim).fill(0);
    for (const row of data) {
        for (let i = 0; i < dim; i++) {
            mean[i] += row[i];
        }
    }
    for (let i = 0; i < dim; i++) {
        mean[i] /= data.length;
    }
    const centered = data.map((row) => row.map((v, i) => v - mean[i]));
    const cov = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (const row of centered) {
        for (let i = 0; i < dim; i++) {
            for (let j = i; j < dim; j++) {
                cov[i][j] += row[i] * row[j];
            }
        }
    }
    for (let i = 0; i < dim; i++) {
        for (let j = i; j < dim; j++) {
            cov[i][j] /= data.length - 1;
            cov[j][i] = cov[i][j];
        }
    }
    function multiplyMatrixVector(m: number[][], v: number[]): number[] {
        const res = new Array(m.length).fill(0);
        for (let i = 0; i < m.length; i++) {
            let sum = 0;
            for (let j = 0; j < v.length; j++) {
                sum += m[i][j] * v[j];
            }
            res[i] = sum;
        }
        return res;
    }
    function dot(a: number[], b: number[]): number {
        let sum = 0;
        for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
        return sum;
    }
    function norm(v: number[]): number {
        return Math.sqrt(dot(v, v));
    }
    function powerIteration(A: number[][], iterations = 100): { eigenvalue: number; eigenvector: number[] } {
        let b = new Array(A.length).fill(1 / Math.sqrt(A.length));
        for (let i = 0; i < iterations; i++) {
            const Ab = multiplyMatrixVector(A, b);
            const n = norm(Ab);
            b = Ab.map((v) => v / n);
        }
        const eigenvalue = dot(multiplyMatrixVector(A, b), b);
        return { eigenvalue, eigenvector: b };
    }
    let A = cov.map((row) => [...row]);
    const componentsVec: number[][] = [];
    for (let k = 0; k < components; k++) {
        const { eigenvalue, eigenvector } = powerIteration(A);
        componentsVec.push(eigenvector);
        // deflate
        for (let i = 0; i < A.length; i++) {
            for (let j = 0; j < A.length; j++) {
                A[i][j] -= eigenvalue * eigenvector[i] * eigenvector[j];
            }
        }
    }
    const result: number[][] = centered.map((row) =>
        componentsVec.map((vec) => dot(row, vec))
    );
    return result;
}
