/**
 * Some functions
 * @param a int
 * @param b int
 * @returns {*}
 */
const sum = (a, b) => a + b
const mul = (a, b) => a * b
const sub = (a, b) => a - b
const div = (a, b) => a / b

/**
 * These are demo tests for the CI/CD pipeline
 */
test('Adding 1 + 1 equals 2', () => {
    expect(sum(1, 1)).toBe(2)
})
test('Multiplying 1 * 1 equals 1', () => {
    expect(mul(1, 1)).toBe(1)
})
test('Subtracting 1 - 1 equals 0', () => {
    expect(sub(1, 1)).toBe(0)
})
test('Dividing 1 / 1 equals 1', () => {
    expect(div(1, 1)).toBe(1)
})