import { PresenceStore } from './presence.store.js';

describe('PresenceStore', () => {
  const son = { userId: 1, name: 'Sơn' };
  const an = { userId: 2, name: 'An' };

  it('lists online users of a room sorted by name', () => {
    const store = new PresenceStore();
    store.add(3, 's1', son);
    store.add(3, 's2', an);
    store.add(4, 's3', { userId: 5, name: 'Bình' });

    expect(store.list(3)).toEqual([an, son]);
    expect(store.list(4)).toEqual([{ userId: 5, name: 'Bình' }]);
    expect(store.list(9)).toEqual([]);
  });

  it('counts a user with many tabs only once', () => {
    const store = new PresenceStore();
    expect(store.add(3, 's1', son)).toBe(true);
    expect(store.add(3, 's2', son)).toBe(false);
    expect(store.list(3)).toEqual([son]);

    expect(store.remove(3, 's1')).toBeNull();
    expect(store.list(3)).toEqual([son]);
    expect(store.remove(3, 's2')).toBe(1);
    expect(store.list(3)).toEqual([]);
  });

  it('ignores unknown sockets', () => {
    const store = new PresenceStore();
    store.add(3, 's1', son);
    expect(store.remove(3, 'x')).toBeNull();
    expect(store.remove(7, 's1')).toBeNull();
  });

  it('finds rooms a socket is in', () => {
    const store = new PresenceStore();
    store.add(3, 's1', son);
    store.add(4, 's1', son);
    store.add(4, 's2', an);
    expect(store.roomsOf('s1')).toEqual([3, 4]);
    expect(store.roomsOf('s2')).toEqual([4]);
  });
});
