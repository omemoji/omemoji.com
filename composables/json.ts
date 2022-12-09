// import { useState } from '#app'
import jsonData from "@/assets/json/artworks.json";
// // 状態の管理
export const state = () => ({
  data: jsonData
});

// // getters
export const getters = {
  getArtwork: (state: any) => {
    return JSON.parse(state.data);
  },
};
export const useFoo = () => {
  return useState('foo', () => 'bar')
}

export default function () {
  return useState('foo', () => 'bar')
}