import { productDestination } from '../src/lib/product-destination.js';
import { describe, expect, it } from 'vitest';

describe('Landing product destinations', () => {
  it('derives auth routes from the environment-owned product origin', () => {
    expect(productDestination('https://members.example.com')).toEqual({
      signIn: 'https://members.example.com/login',
      register: 'https://members.example.com/register',
    });
  });
});
