import type { Particle } from '../hooks/useParticles';
import { PARTICLE_CONFIG } from '../hooks/useParticles';

export const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
  ctx.save();
  ctx.globalAlpha = particle.opacity;
  // 設定値をtypeごとに参照
  const config = PARTICLE_CONFIG[particle.type] || PARTICLE_CONFIG.circle;
  // 色や線の太さは、PARTICLE_CONFIGに含める場合はここで参照
  if (config.color) ctx.strokeStyle = config.color;
  if (config.lineWidth) ctx.lineWidth = config.lineWidth;

  // 丸以外は座標移動と回転が必要なので、まとめてしまう
  if (particle.type !== 'circle') {
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
  }

  switch (particle.type) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size/2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'square':
      ctx.strokeRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
      break;
    case 'triangle':
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          ctx.lineTo(
            particle.size/2 * Math.cos((i * 2 * Math.PI) / 3),
            particle.size/2 * Math.sin((i * 2 * Math.PI) / 3)
          );
        }
        ctx.closePath();
        ctx.stroke();
        break;
    case 'line':
        ctx.beginPath();
        ctx.moveTo(-particle.size, 0); 
        ctx.lineTo(particle.size, 0);
        ctx.stroke();
        break;
    default:
      break;
  }
  ctx.restore();
};