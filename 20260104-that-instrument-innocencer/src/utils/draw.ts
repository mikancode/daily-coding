import type { Particle } from '../hooks/usePerticles'; // 型だけインポート

export const drawPerticle = (ctx: CanvasRenderingContext2D, perticle: Particle) => {
  ctx.save();
  ctx.globalAlpha = perticle.opacity;
  ctx.strokeStyle = 'white';

  switch (perticle.type) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(perticle.x, perticle.y, perticle.size, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'square':
      ctx.translate(perticle.x, perticle.y);
      ctx.rotate(perticle.rotation);
      ctx.strokeRect(-perticle.size/2, -perticle.size/2, perticle.size, perticle.size);
      break;
    case 'triangle':
        ctx.translate(perticle.x, perticle.y);
        ctx.rotate(perticle.rotation);
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          ctx.lineTo(
            perticle.size * Math.cos((i * 2 * Math.PI) / 3),
            perticle.size * Math.sin((i * 2 * Math.PI) / 3)
          );
        }
        ctx.closePath();
        ctx.stroke();
        break;
    case 'line':
        ctx.beginPath();
        ctx.moveTo(perticle.x - perticle.size, perticle.y);
        ctx.lineTo(perticle.x + perticle.size, perticle.y);
        ctx.lineWidth = perticle.lineWidth;
        ctx.stroke();
        break;
    default:
      break;
  }
  ctx.restore();
};