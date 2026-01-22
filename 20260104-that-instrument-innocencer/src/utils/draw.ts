import type { Particle } from '../hooks/useParticles'; // 型だけインポート

export const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
  ctx.save();
  ctx.globalAlpha = particle.opacity;
  ctx.strokeStyle = 'white';

  switch (particle.type) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'square':
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.strokeRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
      break;
    case 'triangle':
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          ctx.lineTo(
            particle.size * Math.cos((i * 2 * Math.PI) / 3),
            particle.size * Math.sin((i * 2 * Math.PI) / 3)
          );
        }
        ctx.closePath();
        ctx.stroke();
        break;
    case 'line':
        ctx.beginPath();
        ctx.moveTo(particle.x - particle.size, particle.y);
        ctx.lineTo(particle.x + particle.size, particle.y);
        ctx.lineWidth = particle.lineWidth;
        ctx.stroke();
        break;
    default:
      break;
  }
  ctx.restore();
};