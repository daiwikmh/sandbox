/** The indexer provider imports `WebSocket` as a named export; browsers expose it globally. */
const Impl = typeof WebSocket !== 'undefined' ? WebSocket : (undefined as unknown as typeof WebSocket);

export { Impl as WebSocket };
export default Impl;
