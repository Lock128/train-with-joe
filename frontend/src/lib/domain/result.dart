/// A sealed type representing either a successful value or a failure.
///
/// Usage:
/// ```dart
/// final result = await repository.getUser(id);
/// switch (result) {
///   case Success(:final value):
///     print(value.name);
///   case Failure(:final error):
///     print(error);
/// }
/// ```
sealed class Result<T> {
  const Result();

  /// Creates a successful result wrapping [value].
  const factory Result.success(T value) = Success<T>;

  /// Creates a failure result wrapping [error] and optional [stackTrace].
  const factory Result.failure(String error, [StackTrace? stackTrace]) = Failure<T>;

  /// Whether this result is a success.
  bool get isSuccess => this is Success<T>;

  /// Whether this result is a failure.
  bool get isFailure => this is Failure<T>;

  /// Returns the value if success, or null if failure.
  T? get valueOrNull => switch (this) {
        Success(:final value) => value,
        Failure() => null,
      };

  /// Returns the error message if failure, or null if success.
  String? get errorOrNull => switch (this) {
        Success() => null,
        Failure(:final error) => error,
      };

  /// Transforms the success value using [transform].
  Result<R> map<R>(R Function(T value) transform) => switch (this) {
        Success(:final value) => Result.success(transform(value)),
        Failure(:final error, :final stackTrace) => Result.failure(error, stackTrace),
      };

  /// Transforms the success value using an async [transform].
  Future<Result<R>> mapAsync<R>(Future<R> Function(T value) transform) async {
    return switch (this) {
      Success(:final value) => Result.success(await transform(value)),
      Failure(:final error, :final stackTrace) => Result.failure(error, stackTrace),
    };
  }
}

/// Successful result containing a [value].
final class Success<T> extends Result<T> {
  final T value;
  const Success(this.value);

  @override
  String toString() => 'Success($value)';
}

/// Failed result containing an [error] message and optional [stackTrace].
final class Failure<T> extends Result<T> {
  final String error;
  final StackTrace? stackTrace;
  const Failure(this.error, [this.stackTrace]);

  @override
  String toString() => 'Failure($error)';
}
