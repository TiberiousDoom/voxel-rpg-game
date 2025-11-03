import React, { useState, useEffect, useRef } from 'react';
import { Heart, Zap, Package, Home, TrendingUp, X } from 'lucide-react';

// 🎨 SPRITE DATA
// To add sprites: Open sprite-generator.html, then:
// 1. Copy ONLY the content between { and } (not including "const SPRITES =")
// 2. Paste it between the curly braces below
// 3. It should look like:  player: 'data:image/png;base64...',  demon: 'data:image/png;base64...',
const SPRITE_DATA = {
   player: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAmElEQVR4AdyRwQnCQBBF/9iNYBNeJZV4NlXEs5VYimA54z5xZXBnkUW8JPCY8DN5/Gw2+vH6r+Ag928Fuw3qy0zoibqC/SRFhgXz1aygFzYkOO7cl+mJygQnyyTdT8iW/a7mUFPB5WZ2WkwRMtvKPiWpgLrn2RUhoxUSZqUR1MW6EGf2rBFQFcrp8xfekEEUct8ICEdYgeABAAD//2rZ05sAAAAGSURBVAMAO6tIITCscxwAAAAASUVORK5CYII=',
  demon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAhklEQVR4AdyP0RGAIAxDqysxm1M4lAvITJpwcAc25ccfT44eaSRPutrL9WHAbna16XrdvHbKERjYzBari5pebYdDAhg48YK+6A3J2kgAvyUMkCBKQUPKLQF8bsYAGZFS0PTQui0B7tbEkADOeyDUFz1YbkuAuzUxQgD/2FfECAFR4On/AHADAAD//4qOWbYAAAAGSURBVAMAO/IeIb8gnPEAAAAASUVORK5CYII=',
  shadow: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAe0lEQVR4AeyQ0QmAMAxEn06i67iKS3QUl9B17CbKUwoiqT/+iVeOXELuKGl5ia8HDKRNPp2pegONHedTU0EYoGEm0dMdVDsjQBjg3sjESj6opoIwYCE1mUyB2lnprzUM8LsaNEq1s6ux6DBAgwtWWbT1zjDgvvTU/wGwAwAA//9NV/LbAAAABklEQVQDAA1TKCE7xp2uAAAAAElFTkSuQmCC',
  beast: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAjklEQVR4AdyQUQ0CMRBEX1GAhJNyEnBApZwUJJyESjkJOCg8vppmSEj4u00m2b7szDZ74c86a8C20ufTJOZMvMHWKI8bfZRMw6wYoPG+w3LlI3vZbPYdA+pOKVDaAcq+vhmhYoDbWqWvCyh7WfATA9x2PGGU7OcAB0ezvSwp/sBBrz5KlvQ1IA0ndoKAFwAAAP///FkRbQAAAAZJREFUAwAeITghZN3LsAAAAABJRU5ErkJggg==',
  wraith: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAmklEQVR4AeyPsQ2DUBBD/TNGqlSpwhrpUmYLJsgAmYAtUmaUZAAq1vjwkCwhOBASDQUnWbb87/zvTtpYOw+o9Mtg6crZE176Zg8OtT1zGMDAWRddn+qBxlNQYcBbj1Tmm+6fIgE0XjCvMIDfqvQX9/foNN6qABpZedyMx9vYDzcoVaRGtWBgraAmAb7VzIy1Gc+YBPhhLR8BUgsAAP//86XrGwAAAAZJREFUAwAKvjAhhTB+vQAAAABJRU5ErkJggg==',
  golem: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAhUlEQVR4AdyQ0QnAIAxE0y4hjugW7RJmRHGKlicIQWN/+qdwcF6SF/GUn2d3QErpQV/ftPwDBkMIgvAriAtgQHOWGGMTnsyDTAAa2Xrdt5RSmvBk1EbIBFDVo9ba+voLuJBRw1tNAFvsL7DZ6F0Am9hoRTYOc3cBFBiwIvO0BHjNXrYB4AUAAP//z45LkgAAAAZJREFUAwDVgUQhn2PJLQAAAABJRU5ErkJggg==',
  boss: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABAElEQVR4AeyVwQ3CMAxFXXbh0MVggTIFXYDJemCY4hfVUtW4ti9IHKjya8f5+d8JlbjIl5/fMVgXWfeoHrx0gqfIOowy7EGtYpIaIPQQGeTwUGPtUO6mqQFC3a6tEK1tFEkN6DKCCZ3F1ICNk76AhjbIQZskr5LBrCJAQxvkoE2SV8kg0QiXQ4Obfp7TIhIBTuTgGtiPetWd8ygSAY7xld4N14DPD7yVXgFcoPRuuAbGoruXXlEEOMb3YmhA93e9oghwPGGrhQZ0V4GJeTE04F4BXQJyQA7IgSdstdDASHaKs7nVvVgyoEtgAuTA5lEsGUQC2drfILuh/A8nVUgIHwAAAP//JvDSoQAAAAZJREFUAwAdl2QxvALkwAAAAABJRU5ErkJggg==',
  dungeonMonster: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAlUlEQVR4AdyQsQmAMBBFTyewsREEHcJ9bBwhUziCjfu4hCDY2LiB8oTIQU5B7BL45PPz7yUklZ8rdkAv/YHevunxDxjMq04Q/gliAhhwh5OiWS7hySyICaA41rusU3kJT2bJBDhxyTYPdx9PdgfKmAD/3HbOEkTfZ3itAEDRuo2MMz2MDwAUOfC79jojRwGA8IsiAJwAAAD//1ypuIgAAAAGSURBVAMAVdkyIWnw3m4AAAAASUVORK5CYII=',
  goldCoin: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAkklEQVR4AaSOvQmFQBCE973U3IYMNBKswh4swB6sQjDSwIbMjdXv4GTOE0Q8mNvd+WH3by/f98DYJpviekCwAWNeraaA09AZQMBoaWlTnxgVIxwaPTgDDGDqZor56gb5okBeZ0721Q3yRQE0zI8bimb9uduXwewAtxOGQ6MHwQYEDAo4jB5BABKDAk4RBVS863cAAAD//zQpYmAAAAAGSURBVAMAIIpCGVzW30EAAAAASUVORK5CYII=',
  essence: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAg0lEQVR4AayNwQmAMBAETy3Alx9FSBOWZhWWZhMB0Y8vC5DICIHLJR/BwJC9yw6p5eP5R1gkBCh9nv1AsXOXANlKiUCBYj9tAmR2WkqE+OCGRiDO+i4KumBzUfD7LWDLzIkwS1WdvpVjHV/I7ChGEoElBYpAZqfJBB4pAtlSFGxJzw8AAAD//7+AwlAAAAAGSURBVAMAvnwqGR0kpxsAAAAASUVORK5CYII=',
  potion: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAdUlEQVR4AayN0QmAIBRFX60QLuIMtlNNUNFKzuB3O7hCYDxRuOj9KEi4etVzeKN8XP8I5zwlDRtOJ9zHJZpXwhZiqiD2+kYnLNaIpkJ4UkGckxwkS+eC9yKaAuHBBSSaToU9RNE0bL52wmrNgMkUbJ0Af7Q+AAAA//80HK4GAAAABklEQVQDAIqaHBlGHvWKAAAAAElFTkSuQmCC',
  wood: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAg0lEQVR4AaSOMQqAMAxFo2dwEgfpLOLm6kU8nRdxdRNxLg7i5B20v1BITEHE0t/8pv/RpPRx/QP6rr1i4kOoH5q6Ii4ehlfAZi36Xtz7hjsUUBpDWV54wbuM2AoQr5GLAjDGeewEwT8ZBfAxuA+gAuZlJa4QDFUAwzglMYUwqgDQeNMNAAD//8cWUvMAAAAGSURBVAMA7642GQbvc98AAAAASUVORK5CYII=',
  iron: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAdUlEQVR4AaSOsQ2AMAwEDSMwAz17ZBAqJmAAJqBikOxBzwysADokJGM7BUqkk/7lfzut/Hx1hZTSFaE/UXeBTeO8ygve4i5syyRD3z3YMN4V2M4AtMaDK3BhP04BNCGNKzAkCGhLWLAh7T+FnHMTUSzoQUnfAAAA//9ktXyfAAAABklEQVQDALTLLRn9yTktAAAAAElFTkSuQmCC',
  leather: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAbElEQVR4AeSQoQ2AQAxFW1YgrFDFHqzBAgSFRWBRBIlhDQRboGoYgDDDkbpfkhMEeTWvye9Lm2b0sf4J69CEsa3Cm3iE23DdSnooIYtccJ6cYKGUQkiT0XCChclt6KaNl/1kZN3PHP0SBrH+AQAA//+Pz8I3AAAABklEQVQDANEkXRl8sNB3AAAAAElFTkSuQmCC',
  crystal: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAdElEQVR4AZSPgQ2AMAgE/13HqZzEOIlTOU/lE4gipIlNP9DCfemCn6sHxhiQGrMKWOOOC1IHVcBcN6yQLC07A+4eXd0rGYjOScwAycPGOe0PknKQfPMZ8IoaJT+mUAHycSSf3LEKeOE7Slz3AFmc50BUm3gDAAD//1TzDPwAAAAGSURBVAMAr9YeGZpEvKAAAAAASUVORK5CYII=',
  ironSword: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAf0lEQVR4AeyRsQ2AMBADDStQhBHCFDARFWNQMVG2YArECEFOReF/kFA6Il30+jiWP2nxcdU1SCll4oV0E8QYvbvlzDUoioftNwDqvEHekUk4e4xhAmuiPkQmaAY0ZJ07ENbktYESWj2ZwBKrvmnAmZftAGGtLrNnGnDmOxQrLgAAAP//LQcBHgAAAAZJREFUAwAqVSEh02zN0gAAAABJRU5ErkJggg==',
  leatherArmor: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAgUlEQVR4AdyQuwmAQBBEV1sQW7AJA0MTe7EQS7ANUwMDOzAysRTlZesxC4LZCQ/OuZt3n9J+fjkLprG/PdFTyTegWFeNeciURApYuG+LecgUoaDtBvOoMlko8LszZrEiFPjdGasymRScx/m6Pycgo5AiBfN6FYq0zL8UMPGVDAQPAAAA//9KZ4vRAAAABklEQVQDAN2aQiEc/grVAAAAAElFTkSuQmCC',
};

// Initialize sprite images
const spriteImages = {};
let spritesLoaded = false;

if (Object.keys(SPRITE_DATA).length > 0) {
  let loadedCount = 0;
  const totalSprites = Object.keys(SPRITE_DATA).length;
  
  Object.keys(SPRITE_DATA).forEach(key => {
    const img = new Image();
    img.onload = () => {
      loadedCount++;
      if (loadedCount === totalSprites) {
        spritesLoaded = true;
        console.log('✅ All sprites loaded!');
      }
    };
    img.src = SPRITE_DATA[key];
    spriteImages[key] = img;
  });
}

const VoxelRPG = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('intro');
  const [player, setPlayer] = useState({
    x: 1000, y: 1000,
    health: 100, maxHealth: 100,
    mana: 100, maxMana: 100,
    level: 1, xp: 0, xpToNext: 100,
    damage: 10, speed: 3,
    facingAngle: 0, defense: 0
  });
  
  const [inventory, setInventory] = useState({
    gold: 100, essence: 5, crystals: 3, potions: 3
  });
  
  const [spells] = useState([
    { id: 'fireball', name: 'Fireball', cost: 10, damage: 25, cooldown: 0, maxCooldown: 30 },
    { id: 'lightning', name: 'Lightning', cost: 15, damage: 40, cooldown: 0, maxCooldown: 45 },
    { id: 'meteor', name: 'Meteor', cost: 30, damage: 80, cooldown: 0, maxCooldown: 90 }
  ]);
  
  const [enemies, setEnemies] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [loot, setLoot] = useState([]);
  const [keys, setKeys] = useState({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [showInventory, setShowInventory] = useState(false);

  const spawnTimerRef = useRef(0);
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;

  // Helper to draw sprites
  const drawSprite = (ctx, spriteName, x, y, width, height) => {
    if (spritesLoaded && spriteImages[spriteName]?.complete) {
      try {
        ctx.drawImage(spriteImages[spriteName], x - width / 2, y - height / 2, width, height);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  const createParticles = (x, y, color, count) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      newParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30, color
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const dropLoot = (x, y) => {
    setLoot(prev => [...prev, {
      id: Date.now(), x, y,
      type: 'gold',
      amount: Math.floor(10 + Math.random() * 20)
    }]);
  };

  const handleCastSpell = (spellId) => {
    const spell = spells.find(s => s.id === spellId);
    if (!spell || spell.cooldown > 0 || player.mana < spell.cost) return;

    setPlayer(p => ({ ...p, mana: p.mana - spell.cost }));

    const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    setProjectiles(p => [...p, {
      id: Date.now(),
      x: player.x, y: player.y,
      vx: Math.cos(angle) * 8,
      vy: Math.sin(angle) * 8,
      damage: spell.damage + player.damage,
      type: spellId
    }]);
    createParticles(player.x, player.y, '#ff6600', 10);
  };

  const handleUsePotion = () => {
    if (inventory.potions > 0) {
      setInventory(inv => ({ ...inv, potions: inv.potions - 1 }));
      setPlayer(p => ({ 
        ...p, 
        health: Math.min(p.maxHealth, p.health + 50) 
      }));
      createParticles(player.x, player.y, '#ff0000', 10);
    }
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      let dx = 0, dy = 0;
      if (keys['w'] || keys['W']) dy -= 1;
      if (keys['s'] || keys['S']) dy += 1;
      if (keys['a'] || keys['A']) dx -= 1;
      if (keys['d'] || keys['D']) dx += 1;
      
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }
      
      setPlayer(p => ({
        ...p,
        x: Math.max(50, Math.min(2450, p.x + dx * p.speed)),
        y: Math.max(50, Math.min(1950, p.y + dy * p.speed))
      }));

      setCamera({ x: player.x - CANVAS_WIDTH / 2, y: player.y - CANVAS_HEIGHT / 2 });

      spawnTimerRef.current++;
      if (spawnTimerRef.current > 300 && enemies.length < 15) {
        spawnTimerRef.current = 0;
        const types = ['demon', 'shadow', 'beast', 'wraith', 'golem'];
        const type = types[Math.floor(Math.random() * types.length)];
        const angle = Math.random() * Math.PI * 2;
        const distance = 400;
        
        setEnemies(e => [...e, {
          id: Date.now(),
          type,
          x: player.x + Math.cos(angle) * distance,
          y: player.y + Math.sin(angle) * distance,
          health: 30 + player.level * 10,
          maxHealth: 30 + player.level * 10,
          damage: 5 + player.level * 2,
          speed: 1.2
        }]);
      }

      setEnemies(prevEnemies => 
        prevEnemies.map(enemy => {
          const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
          
          if (distToPlayer < 400) {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            enemy.x += Math.cos(angle) * enemy.speed;
            enemy.y += Math.sin(angle) * enemy.speed;
          }
          
          if (distToPlayer < 40) {
            setPlayer(p => ({ ...p, health: Math.max(0, p.health - enemy.damage) }));
          }
          
          return enemy;
        })
      );

      setProjectiles(prevProj => 
        prevProj.filter(proj => {
          proj.x += proj.vx;
          proj.y += proj.vy;
          proj.life = (proj.life || 120) - 1;
          
          if (proj.life <= 0) return false;
          
          let hit = false;
          setEnemies(prevEnemies => 
            prevEnemies.map(enemy => {
              const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
              if (dist < 25 && !hit) {
                hit = true;
                enemy.health -= proj.damage;
                createParticles(enemy.x, enemy.y, '#ff0000', 10);
                
                if (enemy.health <= 0) {
                  dropLoot(enemy.x, enemy.y);
                  setPlayer(p => {
                    const newXp = p.xp + 20;
                    if (newXp >= p.xpToNext) {
                      return {
                        ...p,
                        xp: 0,
                        level: p.level + 1,
                        xpToNext: Math.floor(p.xpToNext * 1.5),
                        maxHealth: p.maxHealth + 20,
                        health: p.maxHealth + 20,
                        damage: p.damage + 5
                      };
                    }
                    return { ...p, xp: newXp };
                  });
                }
              }
              return enemy;
            }).filter(e => e.health > 0)
          );
          
          return !hit;
        })
      );

      setParticles(prev => 
        prev.map(p => ({ ...p, life: p.life - 1, x: p.x + p.vx, y: p.y + p.vy }))
           .filter(p => p.life > 0)
      );

      setPlayer(p => ({ ...p, mana: Math.min(p.maxMana, p.mana + 0.1) }));

      setLoot(prevLoot => 
        prevLoot.filter(item => {
          const dist = Math.hypot(player.x - item.x, player.y - item.y);
          if (dist < 30) {
            setInventory(inv => ({ ...inv, gold: inv.gold + item.amount }));
            return false;
          }
          return true;
        })
      );

      if (player.health <= 0) setGameState('gameover');
    };

    const interval = setInterval(gameLoop, 1000 / 60);
    return () => clearInterval(interval);
  }, [gameState, keys, player, enemies, projectiles, mousePos]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      setKeys(k => ({ ...k, [e.key]: true }));
      
      if (e.key === '1') handleCastSpell('fireball');
      if (e.key === '2') handleCastSpell('lightning');
      if (e.key === '3') handleCastSpell('meteor');
      if (e.key === '4') handleUsePotion();
      if (e.key === 'i' || e.key === 'I') setShowInventory(s => !s);
    };

    const handleKeyUp = (e) => setKeys(k => ({ ...k, [e.key]: false }));

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [inventory, player, mousePos]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const canvasX = e.clientX - rect.left + camera.x;
      const canvasY = e.clientY - rect.top + camera.y;
      setMousePos({ x: canvasX, y: canvasY });
      
      const angle = Math.atan2(canvasY - player.y, canvasX - player.x);
      setPlayer(p => ({ ...p, facingAngle: angle }));
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      return () => canvas.removeEventListener('mousemove', handleMouseMove);
    }
  }, [camera, player]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.imageSmoothingEnabled = false;
    
    ctx.fillStyle = '#2d5a3d';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    loot.forEach(item => {
      const screenX = item.x - camera.x;
      const screenY = item.y - camera.y;
      
      const drawn = drawSprite(ctx, 'goldCoin', screenX, screenY, 24, 24);
      if (!drawn) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 30;
      ctx.fillRect(p.x - camera.x - 2, p.y - camera.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;
    
    projectiles.forEach(proj => {
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(proj.x - camera.x, proj.y - camera.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    
    enemies.forEach(enemy => {
      const screenX = enemy.x - camera.x;
      const screenY = enemy.y - camera.y;
      
      const drawn = drawSprite(ctx, enemy.type, screenX, screenY, 32, 32);
      if (!drawn) {
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const emoji = enemy.type === 'demon' ? '👹' : enemy.type === 'shadow' ? '👻' : 
                      enemy.type === 'beast' ? '🐻' : enemy.type === 'wraith' ? '💀' : '🗿';
        ctx.fillText(emoji, screenX, screenY);
      }
      
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(screenX - 16, screenY - 26, 32, 4);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(screenX - 16, screenY - 26, 32 * (enemy.health / enemy.maxHealth), 4);
    });
    
    ctx.save();
    ctx.translate(player.x - camera.x, player.y - camera.y);
    ctx.rotate(player.facingAngle);
    
    const drawn = drawSprite(ctx, 'player', 0, 0, 32, 32);
    if (!drawn) {
      ctx.font = '32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧙', 0, 0);
    }
    
    ctx.restore();
    
  }, [player, enemies, projectiles, particles, loot, camera, gameState]);

  if (gameState === 'intro') {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-8">🧙 Voxel RPG</h1>
          <p className="text-xl text-purple-200 mb-8">A magical adventure awaits!</p>
          <button
            onClick={() => setGameState('playing')}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white text-xl rounded-lg"
          >
            Start Adventure
          </button>
          <div className="mt-8 text-purple-300 text-sm">
            <p>WASD: Move • Mouse: Aim • 1-3: Spells • 4: Potion • I: Inventory</p>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-red-900 to-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-8">💀 Game Over</h1>
          <p className="text-xl text-red-200 mb-8">Level {player.level}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white text-xl rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Heart className="text-red-500" size={20} />
            <div className="w-32 h-4 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500"
                style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
              />
            </div>
            <span className="text-white text-sm">{Math.floor(player.health)}/{player.maxHealth}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Zap className="text-blue-400" size={20} />
            <div className="w-32 h-4 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500"
                style={{ width: `${(player.mana / player.maxMana) * 100}%` }}
              />
            </div>
            <span className="text-white text-sm">{Math.floor(player.mana)}/{player.maxMana}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="text-yellow-400" size={20} />
            <span className="text-white text-sm">Level {player.level}</span>
          </div>
        </div>
        
        <button
          onClick={() => setShowInventory(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-2"
        >
          <Package size={18} />
          Inventory
        </button>
      </div>
      
      <div className="bg-gray-800 p-2 flex gap-2 justify-center border-t border-gray-700">
        {spells.map((spell, i) => (
          <div
            key={spell.id}
            className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 cursor-pointer"
            onClick={() => handleCastSpell(spell.id)}
          >
            <div className="text-white text-sm font-bold">{i + 1} - {spell.name}</div>
            <div className="text-gray-300 text-xs">{spell.cost} mana</div>
          </div>
        ))}
        <div
          className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 cursor-pointer"
          onClick={handleUsePotion}
        >
          <div className="text-white text-sm font-bold">4 - Potion</div>
          <div className="text-gray-300 text-xs">{inventory.potions} left</div>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-black">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-purple-500"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      
      {showInventory && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Inventory</h2>
              <button onClick={() => setShowInventory(false)} className="text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 p-4 rounded text-yellow-400">
                💰 Gold: {inventory.gold}
              </div>
              <div className="bg-gray-700 p-4 rounded text-purple-400">
                ✨ Essence: {inventory.essence}
              </div>
              <div className="bg-gray-700 p-4 rounded text-cyan-400">
                💎 Crystals: {inventory.crystals}
              </div>
              <div className="bg-gray-700 p-4 rounded text-red-400">
                🧪 Potions: {inventory.potions}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-gray-800 p-2 text-center text-white text-sm">
        Enemies: {enemies.length} | Gold: {inventory.gold} {spritesLoaded && '| ✅ Sprites'}
      </div>
    </div>
  );
};

export default VoxelRPG;
