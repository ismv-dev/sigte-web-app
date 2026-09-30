export type UserRole = "USER" | "GUARD" | "ADMIN";

export type UserType = "STAFF" | "STUDENT";

export interface BaseUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  universityId?: string | null;
  active: boolean;
  userType?: UserType | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface StaffUser extends BaseUser {
  userType: "STAFF";
  position: string; // Cargo
  department: string; // Departamento o Unidad
}

export interface StudentUser extends BaseUser {
  userType: "STUDENT";
  rut: string; // RUT
  academicDepartment: string; // Departamento Académico
  career: string; // Carrera
}

export type AppUser = StaffUser | StudentUser | (BaseUser & { userType?: null });

export interface UserSummaryItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  userType: UserType | null;
  rut: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  academicDepartment: string | null;
  career: string | null;
  universityId: string | null;
  active: boolean;
  createdAt: string;
  _count: { vehicles: number };
}
