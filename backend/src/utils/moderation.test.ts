import { moderateReviewText } from './moderation';

describe('moderateReviewText', () => {
  it('allows empty/missing review text', () => {
    expect(moderateReviewText(null).allowed).toBe(true);
    expect(moderateReviewText(undefined).allowed).toBe(true);
    expect(moderateReviewText('').allowed).toBe(true);
  });

  it('allows a normal, well-formed review', () => {
    const result = moderateReviewText('Great session, very patient and explained things clearly!');
    expect(result.allowed).toBe(true);
  });

  it('blocks reviews containing profanity', () => {
    const result = moderateReviewText('This mentor is a fucking joke');
    expect(result.allowed).toBe(false);
  });

  it('blocks reviews containing a link', () => {
    const result = moderateReviewText('Great mentor, check out https://spam-site.example.com for deals');
    expect(result.allowed).toBe(false);
  });

  it('blocks reviews with excessive character repetition', () => {
    const result = moderateReviewText('soooooooooo good!!!!!!!!');
    expect(result.allowed).toBe(false);
  });

  it('blocks reviews that are mostly shouting', () => {
    const result = moderateReviewText('THIS MENTOR IS ABSOLUTELY AMAZING BUY NOW');
    expect(result.allowed).toBe(false);
  });

  it('does not flag short all-caps acronyms', () => {
    const result = moderateReviewText('Helped me a lot with CSS and HTML basics');
    expect(result.allowed).toBe(true);
  });
});
