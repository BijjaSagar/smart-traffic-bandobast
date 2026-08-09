class AuthUser {
  final int id;
  final String name;
  final String badgeNo;
  final String role; // admin | commander | officer

  const AuthUser({
    required this.id,
    required this.name,
    required this.badgeNo,
    required this.role,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as int,
        name: json['name'] as String,
        badgeNo: json['badgeNo'] as String,
        role: json['role'] as String,
      );
}
