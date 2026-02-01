import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserRoles } from "../enums/role.enum";
import { Verification } from "./verification.entity";

export enum USER_STATUS {
  VERIFIED = "verified",
  NOT_VERIFIED = "not_verified",
}
@Entity({ name: "users" })
@Index('Composite', ['role', 'status'])
@Index('composite', ['status', 'deletedAt'])
@Index(['email', 'id'], { unique: true })
export class User {
  @PrimaryGeneratedColumn("uuid")
  @ApiProperty()
  id: string;

  @Column({ length: 50 })
  @ApiProperty()
  first_name: string;
  @Column({ length: 50 })
  @ApiProperty()
  last_name: string;
  @Column({ unique: true, length: 100 })
  @ApiProperty()
  @Index()
  @Column({ unique: true })
  email: string;
  @Column({ type: "varchar", nullable: true })
  @ApiProperty()
  image: string;
  @Column({ type: "varchar", nullable: true, default: USER_STATUS.NOT_VERIFIED })
  @ApiProperty()
  status?: USER_STATUS;
  @Column({ nullable: true, select: false }) // Critical: Never select by default
  @Exclude()
  password: string;

  @Column({ nullable: true, type: "varchar" })
  fcm: string;
  @Column({ nullable: true, type: "varchar" })
  phone: string;
  @Column({ nullable: true, select: false })
  @Exclude()
  current_refresh_token: string;

  @Column({
    type: "enum",
    enum: UserRoles,
    array: true,
    default: [UserRoles.USER],
  })
  roles: UserRoles[];

  @Column({ type: "boolean", default: false })
  @ApiProperty({ default: false })
  is_active: boolean;

  //Relationship

  //Relation ship between user and verification
  @OneToOne(() => Verification, (verification) => verification.user, {
    nullable: true,
    onDelete: "SET NULL",
  })
  verification: Verification;

  //date properties-+

  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt: Date;

  @DeleteDateColumn()
  @ApiProperty()
  deletedAt: Date;
  // Relationships
  @OneToOne(() => ShopProfile, (shopProfile) => shopProfile.user)
  shopProfile: ShopProfile;

  @OneToMany(() => Reel, (reel) => reel.user)
  reels: Reel[];

  @OneToMany(() => Product, (product) => product.user)
  products: Product[];

  @ManyToMany(() => ProductView, (productView) => productView.user)
  productViews: ProductView[];

  @ManyToMany(() => ProductEvent, (productEvent) => productEvent.user)
  productEvents: ProductEvent[];

  @ManyToMany(() => Wishlist, (wishlist) => wishlist.user)
  wishlists: Wishlist[];

  @OneToMany(() => Cart, (cart) => cart.user)
  carts: Cart[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @ManyToMany(() => Review, (review) => review.user)
  reviewsGiven: Review[];

  @ManyToMany(() => Review, (review) => review.shop)
  reviewsReceived: Review[];

  @OneToMany(() => ShippingInfo, (shippingInfo) => shippingInfo.user)
  shippingInfos: ShippingInfo[];

  @OneToMany(() => Notification, (notification) => notification.recipient)
  notifications: Notification[];

  @ManyToMany(
    () => ConversationParticipant,
    (participant) => participant.user,
  )
  conversationParticipants: ConversationParticipant[];

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];
}
