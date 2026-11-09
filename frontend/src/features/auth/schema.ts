import { z } from 'zod';

export const loginSchema = z.object({
  usuario: z.string().trim().min(1, 'Ingrese su usuario'),
  password: z.string().min(1, 'Ingrese su contraseña'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
