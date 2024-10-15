export type User = {
  id: string;
  active: boolean;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  age: number | null;
  address: string | null; // Thêm trường địa chỉ
  phoneNumber: string | null; // Thêm trường số điện thoại
};

export type UserUpdate = Partial<User> & Pick<User, "id">;
