/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { POST_FIT } from '../../theme/typeScale.ts';
import { fitStep, isMostlyCjk, type MeasuredStep } from './postFit.ts';

/** Each step measured at its own leading; `lines[i]` is how many lines the words took at step i. */
function measured(lines: readonly number[], fontScale = 1): MeasuredStep[] {
  return POST_FIT.map(({ size, leading }, at) => ({ size, lines: lines[at], height: lines[at] * Math.round(size * leading) * fontScale, blank: [] }));
}

describe('fitStep', () => {
  it('takes the largest step whose lines fit the room', () => {
    assert.deepEqual(fitStep(300, measured([8, 7, 9, 10, 12, 14])), { size: 36, maxLines: null });
  });

  it('takes the top step when even it fits', () => {
    assert.deepEqual(fitStep(500, measured([2, 2, 3, 3, 4, 5])), { size: 40, maxLines: null });
  });

  it('counts a block exactly as tall as the room as fitting', () => {
    const steps = measured([9, 9, 6, 7, 8, 9]);
    assert.deepEqual(fitStep(steps[2].height, steps), { size: 30, maxLines: null });
  });

  it('clamps at the smallest step to the whole lines that fit, when nothing fits', () => {
    assert.deepEqual(fitStep(200, measured([20, 22, 26, 30, 36, 40])), { size: 19, maxLines: 7 });
  });

  it('never stops on the blank line between paragraphs, so the ellipsis ends words', () => {
    const steps = measured([20, 22, 26, 30, 36, 40]);
    const smallest = { ...steps[5], blank: [6, 5] };
    assert.deepEqual(fitStep(200, [...steps.slice(0, 5), smallest]), { size: 19, maxLines: 5 });
  });

  it('keeps at least one line in a room smaller than a line', () => {
    assert.deepEqual(fitStep(10, measured([20, 22, 26, 30, 36, 40])), { size: 19, maxLines: 1 });
  });

  it('steps lower at a larger system font scale, since the measured lines are taller', () => {
    assert.deepEqual(fitStep(300, measured([6, 6, 5, 5, 5, 6], 2)), { size: 22, maxLines: null });
  });

  it('does not depend on the order the steps were measured in', () => {
    assert.deepEqual(fitStep(300, measured([8, 7, 9, 10, 12, 14]).reverse()), { size: 36, maxLines: null });
  });

  it('has no fit when the smallest step reports no lines', () => {
    const steps = measured([20, 22, 26, 30, 36, 40]);
    assert.equal(fitStep(200, [...steps.slice(0, 5), { size: 19, lines: 0, height: 0, blank: [] }]), null);
  });

  it('has no fit before anything is measured', () => {
    assert.equal(fitStep(300, []), null);
  });
});

describe('isMostlyCjk', () => {
  it('is true for Chinese, Japanese or Korean words, even with Latin and digits in them', () => {
    assert.deepEqual(['斯坦福一位神经科学家的说法 9 分钟', 'ひらがなとカタカナ AI', '한국어 문장입니다'].map(isMostlyCjk), [true, true, true]);
  });

  it('is false for Latin words with a CJK name in them', () => {
    assert.equal(isMostlyCjk('A long note about the Stanford talk, 斯坦福'), false);
  });
});
