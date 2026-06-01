FROM rust:1.84-bookworm AS build
WORKDIR /src
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN useradd --system --home /var/lib/next-sentinel sentinel
COPY --from=build /src/target/release/sentinel-daemon /usr/local/bin/sentinel-daemon
USER sentinel
CMD ["/usr/local/bin/sentinel-daemon"]

