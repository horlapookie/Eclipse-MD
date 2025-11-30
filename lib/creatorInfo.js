import config from '../config.js';

export const creatorInfo = {
  name: config.ownerName || "Eclipse",
  github: "https://github.com/horlapookie",
  contact: `https://wa.me/${config.ownerNumber.replace(/\+/g, '')}`
};

export default creatorInfo;