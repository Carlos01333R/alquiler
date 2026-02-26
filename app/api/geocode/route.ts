import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        address
      )}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "mi-mapa-app (carlosrodriguezanavila0@gmail.com)", // requerido por Nominatim
        },
      }
    );

    const data = await response.json();

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Geocoding failed" },
      { status: 500 }
    );
  }
}