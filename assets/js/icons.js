// SVG icon library — close to WeChat's iconfont style
window.Icons = (function () {
  const I = {};

  // tabs (line + filled variants done via stroke/fill toggle)
  I.tabChats = (active) => active
    ? `<svg viewBox="0 0 28 28" fill="currentColor"><path d="M11.5 4C6.25 4 2 7.7 2 12.27c0 2.62 1.38 4.94 3.54 6.48L4.6 21.4c-.12.36.28.66.59.45l3.32-2.15c.94.25 1.95.39 3 .39.27 0 .54 0 .8-.03a7.42 7.42 0 0 1-.32-2.13c0-4.42 4.04-7.93 9.01-7.93.78 0 1.53.09 2.24.25C22.36 6.92 17.55 4 11.5 4zm-3.4 6.45a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zm6.8 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"/><path d="M21 11.5c-4.42 0-8 3.14-8 7s3.58 7 8 7c.81 0 1.59-.11 2.32-.31l2.59 1.67c.27.17.6-.08.5-.39l-.72-2.21A6.7 6.7 0 0 0 29 18.5c0-3.86-3.58-7-8-7zm-2.6 5.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5.2 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>`
    : `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M11.5 4C6.25 4 2 7.7 2 12.27c0 2.62 1.38 4.94 3.54 6.48L4.6 21.4c-.12.36.28.66.59.45l3.32-2.15c.94.25 1.95.39 3 .39.27 0 .54 0 .8-.03"/><path d="M21 11.5c-4.42 0-8 3.14-8 7s3.58 7 8 7c.81 0 1.59-.11 2.32-.31l2.59 1.67c.27.17.6-.08.5-.39l-.72-2.21A6.7 6.7 0 0 0 29 18.5c0-3.86-3.58-7-8-7z"/><circle cx="8" cy="12" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="0.9" fill="currentColor" stroke="none"/><circle cx="18.5" cy="18.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="23.5" cy="18.5" r="0.9" fill="currentColor" stroke="none"/></svg>`;

  I.tabContacts = (active) => active
    ? `<svg viewBox="0 0 28 28" fill="currentColor"><path d="M14 4a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM6 25a8 8 0 0 1 16 0v.5H6V25z"/></svg>`
    : `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="14" cy="9.5" r="5"/><path d="M5.5 24.5a8.5 8.5 0 0 1 17 0"/></svg>`;

  I.tabDiscover = (active) => active
    ? `<svg viewBox="0 0 28 28" fill="currentColor"><circle cx="14" cy="14" r="11"/><path fill="#fff" d="m13 9 5-2-2 5-5 2 2-5z"/></svg>`
    : `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="14" cy="14" r="10.5"/><path d="m12 10 6-2-2 6-6 2 2-6z" fill="currentColor" stroke="none"/></svg>`;

  I.tabMe = (active) => active
    ? `<svg viewBox="0 0 28 28" fill="currentColor"><path d="M14 4a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM4 25a10 10 0 1 1 20 0v.5H4V25z"/></svg>`
    : `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="14" cy="9.5" r="5"/><path d="M4.5 24.5a9.5 9.5 0 0 1 19 0"/></svg>`;

  I.back = `<svg viewBox="0 0 12 21" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="10,1 1.5,10.5 10,20"/></svg>`;
  I.chevron = `<svg viewBox="0 0 8 14" fill="none" stroke="#C7C7CC" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,1 7,7 1,13"/></svg>`;
  I.search = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><line x1="14" y1="14" x2="11" y2="11" stroke-linecap="round"/></svg>`;
  I.plus = `<svg viewBox="0 0 28 28" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"><circle cx="14" cy="14" r="11.5"/><line x1="14" y1="8" x2="14" y2="20"/><line x1="8" y1="14" x2="20" y2="14"/></svg>`;
  I.plusFilled = `<svg viewBox="0 0 28 28" fill="#000"><circle cx="14" cy="14" r="12" fill="none" stroke="#000" stroke-width="1.5"/><rect x="13" y="8" width="2" height="12"/><rect x="8" y="13" width="12" height="2"/></svg>`;
  I.more = `<svg viewBox="0 0 24 24" fill="#000"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>`;
  I.qr = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="6" y="6" width="1" height="1" fill="currentColor"/><rect x="17" y="6" width="1" height="1" fill="currentColor"/><rect x="6" y="17" width="1" height="1" fill="currentColor"/><rect x="14" y="14" width="2" height="2" fill="currentColor"/><rect x="19" y="14" width="2" height="2" fill="currentColor"/><rect x="14" y="19" width="2" height="2" fill="currentColor"/><rect x="19" y="19" width="2" height="2" fill="currentColor"/></svg>`;
  I.scan = `<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"><path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`;
  I.mute = `<svg viewBox="0 0 16 16" fill="#A0A0A0"><path d="M3 5h2.5L9 2v12L5.5 11H3V5z"/><line x1="11" y1="5" x2="14" y2="8" stroke="#A0A0A0" stroke-width="1.5"/><line x1="14" y1="5" x2="11" y2="8" stroke="#A0A0A0" stroke-width="1.5"/></svg>`;

  // input bar
  I.ibVoice = `<svg viewBox="0 0 30 30" fill="none" stroke="#000" stroke-width="1.4"><circle cx="15" cy="15" r="13"/><rect x="12.5" y="8" width="5" height="9" rx="2.5" fill="#000" stroke="none"/><path d="M9 15a6 6 0 0 0 12 0M15 21v3M11 24h8"/></svg>`;
  I.ibKeyboard = `<svg viewBox="0 0 30 30" fill="none" stroke="#000" stroke-width="1.4"><circle cx="15" cy="15" r="13"/><rect x="7" y="10" width="16" height="10" rx="1.5"/><circle cx="10" cy="13.5" r="0.8" fill="#000" stroke="none"/><circle cx="13" cy="13.5" r="0.8" fill="#000" stroke="none"/><circle cx="16" cy="13.5" r="0.8" fill="#000" stroke="none"/><circle cx="19" cy="13.5" r="0.8" fill="#000" stroke="none"/><line x1="9" y1="17" x2="21" y2="17"/></svg>`;
  I.ibEmoji = `<svg viewBox="0 0 30 30" fill="none" stroke="#000" stroke-width="1.4"><circle cx="15" cy="15" r="13"/><circle cx="11" cy="13" r="1" fill="#000" stroke="none"/><circle cx="19" cy="13" r="1" fill="#000" stroke="none"/><path d="M10 18a6 6 0 0 0 10 0" stroke-linecap="round"/></svg>`;
  I.ibPlus = `<svg viewBox="0 0 30 30" fill="none" stroke="#000" stroke-width="1.4"><circle cx="15" cy="15" r="13"/><line x1="15" y1="9" x2="15" y2="21" stroke-linecap="round"/><line x1="9" y1="15" x2="21" y2="15" stroke-linecap="round"/></svg>`;

  // plus panel icons
  I.album = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="6" width="24" height="20" rx="2"/><circle cx="11" cy="13" r="2"/><path d="M4 22l7-7 6 6 4-4 7 7"/></svg>`;
  I.camera = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 10h4l2-3h10l2 3h4a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1z"/><circle cx="16" cy="17" r="5"/></svg>`;
  I.video = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="3"/><circle cx="22" cy="11" r="1" fill="currentColor"/></svg>`;
  I.location = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 4c-5 0-9 4-9 9 0 7 9 16 9 16s9-9 9-16c0-5-4-9-9-9z"/><circle cx="16" cy="13" r="3"/></svg>`;
  I.redpacket = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="6" width="20" height="22" rx="2"/><path d="M6 12h20M14 6c0 4 4 4 4 0M11 18a5 5 0 0 0 10 0" /></svg>`;
  I.transfer = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 11h20l-4-4M28 21H8l4 4"/></svg>`;
  I.voiceInput = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="13" y="6" width="6" height="14" rx="3"/><path d="M9 17a7 7 0 0 0 14 0M16 24v4M11 28h10"/></svg>`;
  I.favorite = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 6L18 12L24 12L19 16L21 22L16 18L11 22L13 16L8 12L14 12Z"/></svg>`;
  I.contactCard = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="6" width="24" height="20" rx="2"/><circle cx="11" cy="14" r="3"/><path d="M6 22a5 5 0 0 1 10 0M18 12h7M18 17h6M18 20h4"/></svg>`;
  I.file = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 4h10l6 6v17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M19 4v6h6"/></svg>`;
  I.card = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="8" width="24" height="16" rx="2"/><line x1="4" y1="13" x2="28" y2="13"/></svg>`;
  I.miniprogram = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="16" cy="16" r="11"/><path d="M9 13a7 4 0 0 1 14 0c0 4-4 7-7 8-3-1-7-4-7-8z"/></svg>`;

  // emoji panel
  I.delete = `<svg viewBox="0 0 24 24" fill="#666"><path d="M3 12l4-6h13a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7l-4-6z"/><path d="M11 9l4 6M15 9l-4 6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  I.send = `<svg viewBox="0 0 24 24" fill="#fff"><path d="M3 12L20 4 13 21 11 13z"/></svg>`;

  // discover icons
  I.dMoments = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="9" r="3"/><circle cx="19" cy="9" r="3"/><circle cx="9" cy="19" r="3"/><circle cx="19" cy="19" r="3"/></svg>`;
  I.dVideo = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="22" height="16" rx="2"/><path d="M12 11l6 3-6 3v-6z" fill="currentColor"/></svg>`;
  I.dLive = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 7v14M9 9v10M19 9v10M5 12v4M23 12v4"/></svg>`;
  I.dScan = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 9V5a1 1 0 0 1 1-1h4"/><path d="M19 4h4a1 1 0 0 1 1 1v4"/><path d="M24 19v4a1 1 0 0 1-1 1h-4"/><path d="M9 24H5a1 1 0 0 1-1-1v-4"/><line x1="3" y1="14" x2="25" y2="14"/></svg>`;
  I.dShake = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 4 4 9l11 11 5-5z" stroke-linejoin="round"/><rect x="14" y="18" width="6" height="2" transform="rotate(-45 14 18)" fill="currentColor"/></svg>`;
  I.dLook = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 14c3-6 7-9 12-9s9 3 12 9c-3 6-7 9-12 9s-9-3-12-9z"/><circle cx="14" cy="14" r="3.5"/></svg>`;
  I.dSearch = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8"/><line x1="18" y1="18" x2="24" y2="24" stroke-linecap="round"/></svg>`;
  I.dNearby = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="14" cy="14" r="2.5" fill="currentColor"/><circle cx="14" cy="14" r="6"/><circle cx="14" cy="14" r="10"/></svg>`;
  I.dShopping = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 9h18l-2 14H7L5 9z"/><path d="M10 9V6a4 4 0 0 1 8 0v3"/></svg>`;
  I.dGame = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="9" width="22" height="12" rx="6"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/><circle cx="19" cy="15" r="1.2" fill="currentColor"/></svg>`;
  I.dMiniprog = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="14" cy="14" r="10"/><path d="M8 12a6 4 0 0 1 12 0c0 4-4 6-6 7-2-1-6-3-6-7z"/></svg>`;

  // me / common
  I.wallet = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="22" height="16" rx="2"/><path d="M19 14h3"/></svg>`;
  I.services = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="9" height="9" rx="1.5"/><rect x="16" y="3" width="9" height="9" rx="1.5"/><rect x="3" y="16" width="9" height="9" rx="1.5"/><rect x="16" y="16" width="9" height="9" rx="1.5"/></svg>`;
  I.collect = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 4h14v20l-7-4-7 4V4z"/></svg>`;
  I.emojiManage = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="14" cy="14" r="10"/><circle cx="10" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/><path d="M9 17a6 6 0 0 0 10 0"/></svg>`;
  I.setting = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="14" cy="14" r="3"/><path d="M14 2v3M14 23v3M2 14h3M23 14h3M5 5l2 2M21 5l-2 2M5 23l2-2M21 23l-2-2"/></svg>`;

  // moments
  I.mCamera = `<svg viewBox="0 0 28 28" fill="#fff"><rect x="4" y="8" width="20" height="14" rx="2"/><rect x="11" y="6" width="6" height="4"/><circle cx="14" cy="15" r="4" fill="#000"/></svg>`;
  I.mLike = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 6h2v8H3zM6 6l2-3a1.5 1.5 0 0 1 3 1l-1 2h3a1 1 0 0 1 1 1l-1 5a1 1 0 0 1-1 1H6V6z"/></svg>`;
  I.mComment = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 4h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6l-3 3v-3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/></svg>`;
  I.mDots = `<svg viewBox="0 0 4 16" fill="currentColor"><circle cx="2" cy="4" r="1"/><circle cx="2" cy="8" r="1"/><circle cx="2" cy="12" r="1"/></svg>`;

  // misc
  I.pin = `<svg viewBox="0 0 16 16" fill="#A0A0A0"><circle cx="8" cy="8" r="6"/></svg>`;
  I.play = `<svg viewBox="0 0 44 44" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.9)"><circle cx="22" cy="22" r="20"/><path fill="#fff" d="M17 14l14 8-14 8V14z" stroke="none"/></svg>`;
  I.mapPin = `<svg viewBox="0 0 20 24" fill="#FA5151"><path d="M10 0a8 8 0 0 0-8 8c0 6 8 16 8 16s8-10 8-16a8 8 0 0 0-8-8z"/><circle cx="10" cy="8" r="3" fill="#fff"/></svg>`;
  I.filePdf = `<svg viewBox="0 0 40 40" fill="none"><rect x="4" y="4" width="32" height="32" rx="3" fill="#F7F7F7" stroke="#E0E0E0"/><text x="20" y="26" text-anchor="middle" font-size="11" fill="#F44" font-weight="600">PDF</text></svg>`;
  I.fileWord = `<svg viewBox="0 0 40 40" fill="none"><rect x="4" y="4" width="32" height="32" rx="3" fill="#F0F5FB" stroke="#D0DBEA"/><text x="20" y="26" text-anchor="middle" font-size="13" fill="#2B5797" font-weight="600">W</text></svg>`;
  I.fileExcel = `<svg viewBox="0 0 40 40" fill="none"><rect x="4" y="4" width="32" height="32" rx="3" fill="#EFF6EC" stroke="#CFE3C3"/><text x="20" y="26" text-anchor="middle" font-size="13" fill="#217346" font-weight="600">X</text></svg>`;
  I.fileGeneric = `<svg viewBox="0 0 40 40" fill="none"><rect x="4" y="4" width="32" height="32" rx="3" fill="#F7F7F7" stroke="#E0E0E0"/><path d="M14 12h12v16H14z" fill="#fff" stroke="#A0A0A0"/><path d="M22 12v6h4" fill="none" stroke="#A0A0A0"/></svg>`;

  // profile actions
  I.actionMsg = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z"/></svg>`;
  I.actionCall = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h4l2 5-3 1a10 10 0 0 0 6 6l1-3 5 2v4a1 1 0 0 1-1 1A17 17 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>`;

  // discover badge dot color override
  I.heart = `<svg viewBox="0 0 14 12" fill="currentColor"><path d="M7 11.5S0.5 7.5 0.5 4a3.5 3.5 0 0 1 6.5-1.5A3.5 3.5 0 0 1 13.5 4c0 3.5-6.5 7.5-6.5 7.5z"/></svg>`;

  return I;
})();
