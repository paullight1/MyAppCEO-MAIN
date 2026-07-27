import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { users } from '../../database/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    if (!user) throw new NotFoundException('User not found');
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  async create(userData: any) {
    const existing = await this.findByEmail(userData.email);
    if (existing) throw new ConflictException('User already exists');

    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const [newUser] = await this.db.insert(users).values({
      email: userData.email,
      passwordHash,
      role: userData.role || 'ceo',
      fullName: userData.fullName,
    }).returning();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...result } = newUser;
    return result;
  }
}
