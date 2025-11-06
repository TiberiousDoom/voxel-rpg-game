import { Howl } from 'howler';

// Audio manager using Howler.js
export class AudioManager {
  constructor() {
    this.sounds = {};
    this.musicVolume = 0.5;
    this.sfxVolume = 0.7;
    this.muted = false;
  }

  // Initialize sounds (will work with placeholder sounds for now)
  init() {
    // Using data URIs for simple beep sounds as placeholders
    // In production, replace with actual audio files

    this.sounds.fireball = new Howl({
      src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGH0fPTgjMGHGS36+yhUhELTKXh8bllHAU2jdXzzn0qBSl+zPLaizsIGGS66+WYSwwOVKzn77BdGAg+ltryxnMpBSh4yO7ZjT0HFm' +
              '286OSxWxoJPJPY88p6KwUme8rx3I9ACRNht+jnpVYUCkKa3O6VUxYJQJjW8sh5LAUnesjt2Y9ACRVhuOrloFYSCkGb3fG8aBwGM4nT88h+LQYff8rx3pE/CRRhuejmlVMWCj+Y1/O+bR4GMojT8MV/LwUpfcvv2pJBCBNfuOjln1sZCTuT1/O/bh4GMYjS8sR/MAUqfszw2pJCCBJfuejln1waCzyU2fS/cB4GMYfS8MJ+MAYrfc3x2ZNECBFfuejlnl0bCzyT2PO+cR8GMofU8sJ+MQUsfc7y2ZNGCBFguefjm10cCzyS2PO9ciEGMofU88F+MgYtfM/z2JRGCBBhuefjnV4dCzuS1/O7cyIGMYfU88F+MwYtfM/z2JNHBw9iuufim14eDD2S1/O6dCIHMYbU88B+NAcudM/z15RIBw5iu+fhm18fCzyS1fO4dSIHMobV88B+NAcudNDz15VJBw5ju+fgm2AfCzuR1fO3dSMHMobV88B+NQcvdNDz1pVKBg1ku+fgml8gCjqR1PO2dSMGMYXV88F+Ngcv' +
              'ddDz1ZVLBg1ku+ffmWEhCjmR0/O1dSMGMYXV88F/Ngcvdc/y1JVLBg1lvObfmGEhCjiR0vO0dCMHMITV88J/Nwcwds/y05ZMBQxmvObfl2IhCTeQ0vKzciMHMITV88J/OAcwds/y0pZNBQxmvObfk2Mi',
      volume: this.sfxVolume,
      loop: false
    });

    this.sounds.hit = new Howl({
      src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA'],
      volume: this.sfxVolume,
      loop: false
    });

    this.sounds.levelup = new Howl({
      src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA'],
      volume: this.sfxVolume,
      loop: false
    });

    this.sounds.explosion = new Howl({
      src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA'],
      volume: this.sfxVolume,
      loop: false
    });

    this.sounds.heal = new Howl({
      src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA'],
      volume: this.sfxVolume,
      loop: false
    });
  }

  play(soundName) {
    if (this.muted || !this.sounds[soundName]) return;
    try {
      this.sounds[soundName].play();
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  setSfxVolume(volume) {
    this.sfxVolume = volume;
    Object.values(this.sounds).forEach(sound => {
      sound.volume(volume);
    });
  }
}

export const audioManager = new AudioManager();
