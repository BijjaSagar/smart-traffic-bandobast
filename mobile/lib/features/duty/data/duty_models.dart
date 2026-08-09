class DutyPost {
  final int id;
  final int eventId;
  final String name;
  final String type;
  final double lat;
  final double lng;
  final int geofenceRadiusM;

  const DutyPost({
    required this.id,
    required this.eventId,
    required this.name,
    required this.type,
    required this.lat,
    required this.lng,
    required this.geofenceRadiusM,
  });

  factory DutyPost.fromJson(Map<String, dynamic> json) => DutyPost(
        id: json['id'] as int,
        eventId: json['eventId'] as int,
        name: json['name'] as String,
        type: json['type'] as String,
        lat: (json['lat'] as num).toDouble(),
        lng: (json['lng'] as num).toDouble(),
        geofenceRadiusM: json['geofenceRadiusM'] as int,
      );
}

class DutyAssignment {
  final int assignmentId;
  final DateTime shiftStart;
  final DateTime shiftEnd;
  final DutyPost post;

  const DutyAssignment({
    required this.assignmentId,
    required this.shiftStart,
    required this.shiftEnd,
    required this.post,
  });

  factory DutyAssignment.fromJson(Map<String, dynamic> json) => DutyAssignment(
        assignmentId: json['assignmentId'] as int,
        shiftStart: DateTime.parse(json['shiftStart'] as String),
        shiftEnd: DateTime.parse(json['shiftEnd'] as String),
        post: DutyPost.fromJson(json['post'] as Map<String, dynamic>),
      );
}
